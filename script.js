// constants
const DB_NAME = "HISTORY_DB_0";
const OBJ_STORE_NAME = "HISTORY_OBJ_STORE_0";
const HISTORY_OS_VALUE_KEY = "HISTORY";
const INTL_DATETIMEFORMAT_OPTIONS = {
    year:"numeric", 
    month:"numeric", 
    day:"numeric", 
    weekday: "long", 
    hour12: true, 
    hour: "numeric", 
    minute:"numeric", 
    second:"numeric"
};
const INTL_DATETIMEFORMAT_LOCALE = 'en-US';
const MEASURMENT_SYS_METRIC = 1;
const MEASURMENT_SYS_IMPERIAL = 2;
const MEASURMENT_SYS_NULL = 0;


var calcBtn = null;
var bmiValDisplay = null;
var bmiValDesc = null;
var weightInput = null;
var heightInput = null;
var hs_table_contents = null;
var clr_all_btn = null;
var age_chk_confirm_btn = null;
var measurment_sys_radios = null;

// global variable that holds the current measurment system
var current_measurment_system = MEASURMENT_SYS_METRIC;

// db connection object
var dbConnection = null;

// 2D Array of BMI Values history
var hs = null;

// categories elements
var underweight_cat = null;
var normal_cat = null;
var overweight_cat = null;
var obese_cat = null;

// categories elements titles
var underweight_cat_title = null;
var normal_cat_title = null;
var overweight_cat_title = null;
var obese_cat_title = null;




// calculate BMI Function
// the formula is: weight / height**2 (where height is in meters)
// to convert height from meters to centimeters, divide by 100
function calculateBMI(params) {
    var heightInMeters = heightInput.value / 100;
    console.log("debug: height in meters is: " + heightInMeters);
    // calculate the BMI
    // here we have two methods to calculate the BMI according to which 
    // measurment system we are in
    /*
        For metric system:
            weight / (height in meters**2)
        For imperial system:
            (weight / (height**2) ) * 703
        
    */
    // metric system BMI value
    if (current_measurment_system === MEASURMENT_SYS_METRIC) {
        var BMI_Value = Math.round((weightInput.value / (heightInMeters**2)));
    } else if (current_measurment_system === MEASURMENT_SYS_IMPERIAL) {
        var BMI_Value = Math.round( (weightInput.value / (heightInput.value**2)) * 703 );
    } else {
        var BMI_Value = -1;
    }
    console.log("debug BMI Value: " + BMI_Value);
    // display the BMI Value to the user.
    bmiValDisplay.innerHTML = BMI_Value;
    // display the description of the BMI to the user accordingly.
    /**
     * Underweight: BMI < 18.5
        Normal weight: 18.5 – 24.9
        Overweight: 25 – 29.9
        Obese: BMI ≥ 30
     */
    // delete style attributes for all weight categories divs
    underweight_cat.removeAttribute("style");
    normal_cat.removeAttribute("style");
    overweight_cat.removeAttribute("style");
    obese_cat.removeAttribute("style");
    // remove class vtext from all weight categories descriptions if exist.
    document.querySelectorAll(".weight_category_title").forEach(elem => {
        elem.classList.remove("vtext");
    });

    if (BMI_Value < 18.5) {
        bmiValDesc.innerHTML = "Underweight";
        underweight_cat.style = "background-color: purple;";
        underweight_cat_title.classList.add("vtext");
    } else if (BMI_Value >= 18.5 && BMI_Value < 25) {
        bmiValDesc.innerHTML = "Normal";
        normal_cat.style = "background-color: green;";
        normal_cat_title.classList.add("vtext");
    } else if (BMI_Value >= 25 && BMI_Value < 30) {
        bmiValDesc.innerHTML = "Overweight";
        overweight_cat.style = "background-color: yellow;";
        overweight_cat_title.classList.add("vtext");
        overweight_cat_title.style = "color: black;";
    } else {
        bmiValDesc.innerHTML = "Obese";
        obese_cat.style = "background-color: red;";
        obese_cat_title.classList.add("vtext");
    };
    // okay so here should reside the code for storing the calculated value
    // with the current date into the indexedDB
    // we have to retrieve time in a good format first.
    const intlFmt = new Intl.DateTimeFormat(INTL_DATETIMEFORMAT_LOCALE, INTL_DATETIMEFORMAT_OPTIONS);
    const dateObj = new Date();
    const dateTimeString = intlFmt.format(dateObj);
    // BMI_Value is in BMI_Value
    hs.push([BMI_Value, dateTimeString]);
    // commit changes to the database
    const trans = dbConnection.transaction([OBJ_STORE_NAME], "readwrite");
    const objStoreFromTrans = trans.objectStore(OBJ_STORE_NAME);
    const req = objStoreFromTrans.put(hs, HISTORY_OS_VALUE_KEY);
    req.onsuccess = (evt) => {
        console.log("DEBUG: Successfully wrote BMI Value to the database!!!");
        onDBOpenSuccess(evt);
        // updateHistoryTable(evt);
        console.log("DEBUG: Updated value from database!");
    }
    req.onerror = (evt) => {
        console.log("ERROR: Failure: Failed to write new BMI Value to Database!!!");
        // ensure the user sees it.
        hs_table_contents.innerHTML += "<tr><td>Failed to write BMI Value to Database!!!</td></tr>";
    }


    return;
};


/*
    IndexedDB encourages this pattern:
    1-Create a database. (it fires the callback for the event onupgradeneeded if the database was just created)
    2-Create an object store
    3-Create a transaction to write or retrieve data from an object store.
    4-Wait for the operation to complete and listen for success events using DOM Callbacks
    5-Do something with the resulting data.
*/
function onDBFirstCreated(evt) {
    console.log("DEBUG: Database was just created or upgrade needed, creating an object store...");
    // create an object store
    dbConnection = evt.target.result;
    const objStore = dbConnection.createObjectStore(OBJ_STORE_NAME);
    objStore.transaction.oncomplete = (evt) => {
        // code to be executed when data store finishes execution!
        console.log("DEBUG: Object store \"" + OBJ_STORE_NAME + "\": successfully created!");
        const trans = dbConnection.transaction([OBJ_STORE_NAME], "readwrite");
        trans.onerror = (evt) => {
            console.log("ERROR: Transaction error!");
            document.getElementById("history_table_contents").innerHTML = "<tr><td>A Transaction Error has occured!</td></tr>";
        }
        const objStoreFromTrans = trans.objectStore(OBJ_STORE_NAME);
        const request = objStoreFromTrans.put([], HISTORY_OS_VALUE_KEY);
        request.onsuccess = (evt) => {
            console.log("DEBUG: Successfully created value " + HISTORY_OS_VALUE_KEY + "!");
        }
        request.onerror = (evt) => {
            console.error("ERROR: Failed to create value " + HISTORY_OS_VALUE_KEY + "!");
        }
    }
    return;
}

function onDBOpenSuccess(evt) {
    // we will use a transaction to load the history value from the db
    const trans = dbConnection.transaction([OBJ_STORE_NAME], "readwrite");
    const objStoreFromTrans = trans.objectStore(OBJ_STORE_NAME);
    const req = objStoreFromTrans.get(HISTORY_OS_VALUE_KEY);
    req.onsuccess = (evt) => {
        hs = req.result;
        console.log("DEBUG: Retrieved history array!");
        updateHistoryTable(evt);
    }
}


function updateHistoryTable(evt) {
    // first we must clear the history table.
    hs_table_contents.innerHTML = '';
    // we have the entire history table stored inside hs
    // and hs is a 2D array
    hs.forEach((element) => {
        var table_item_string = "<tr><td>";
        table_item_string += element[0];
        table_item_string += "</td><td>";
        table_item_string += element[1];
        table_item_string += "</td></tr>";
        hs_table_contents.innerHTML += table_item_string;
    });
    return;
}


function onLoadHistoryLoader() {
    const dbOpenReq = window.indexedDB.open(DB_NAME);
    dbOpenReq.onerror = (evt) => {
        console.log("ERROR: Failed to open indexedDB database!!!");
        document.getElementById("history_table_contents").innerHTML = "<tr><td>Error: failed to open Database!</td></tr>";
    }
    dbOpenReq.onupgradeneeded = onDBFirstCreated;
    dbOpenReq.onsuccess = (evt) => {
        console.log("Successfully opened database: " + DB_NAME);
        dbConnection = evt.target.result;
        onDBOpenSuccess(evt);
    }
}


// Handler for onclick event for the clear all button
function onClrAllBtnClick(evt) {
    // use existing database connection (or exit if it's null)
    if (dbConnection != null) {
        // there's a valid database connection
        // 0- Empty the array hs
        hs = [];
        // 1- create a transaction
        const trans = dbConnection.transaction([OBJ_STORE_NAME], "readwrite");
        // 2- Get an object store from the transaction
        const objStoreFromTrans = trans.objectStore(OBJ_STORE_NAME);
        // 3- Get a request by putting an empty array into the key inside the object store
        const req = objStoreFromTrans.put(hs, HISTORY_OS_VALUE_KEY);
        // 4- Set onsuccess to call onDBOpenSuccess(evt)!
        req.onsuccess = onDBOpenSuccess;
        req.onerror = (evt) => {
            console.error("ERROR: Failed to clear database!");
            hs_table_contents.innerHTML = "<tr><td>ERROR: Failed to clear history!</td></tr>";
        }
    } else {
        return
    }
}

function onAgeCheckConfirm(evt) {
    // change our background color to something valid.
    age_chk_confirm_btn.style = "background-color:grey;";
    // we must remove the classes blur and noclicks from the body
    document.body.removeAttribute("class");
    // hide our full-screen overlay
    document.getElementById("age_check_overlay").style.display = "none";
    return;
}

/*
    A callback function for when the measurment system changes (by the click of a radio button)

    For the metric (SI) system:
        * Weight: Kilograms
        * Height: centimeters
    For the imperial (US) system:
        * Weight: pounds
        * Height: inches

*/
function onSysChange(params) {
    console.log("DEBUG: onSysChange() called!");
    // update the global variable according to the currently selected system unit
    var _curMSysVal = document.querySelector('input[name="sys"]:checked').value;
    if (_curMSysVal === "metric") {
        current_measurment_system = MEASURMENT_SYS_METRIC;
        console.log("DEBUG: Currently selected measurment system is Metric!");
        // update displayed weight and height hints to kilograms and centimeters
        document.getElementById("weight_unit_title").innerHTML = "Kilograms";
        document.getElementById("height_unit_title").innerHTML = "centimeters";
    } else if (_curMSysVal === "imperial") {
        current_measurment_system = MEASURMENT_SYS_IMPERIAL;
        console.log("DEBUG: currently selected measurment system is: imperial");
        document.getElementById("weight_unit_title").innerHTML = "Pounds (lbs)";
        document.getElementById("height_unit_title").innerHTML = "inches";
    } else {
        current_measurment_system = MEASURMENT_SYS_NULL;
        console.log("ERROR: Invalid measurment system selected!");
        document.getElementById("weight_unit_title").innerHTML = "Invalid weight unit!";
        document.getElementById("height_unit_title").innerHTML = "Invalid height unit!";
    }
    // then update the displayed weight and height hints
    return;
}


function onLoad(params) {
    //DOM Content Loaded.
    console.log("DOM Content Loaded!, executing onLoad()...");
    calcBtn = document.getElementById("calc_btn");
    bmiValDisplay = document.getElementById("bmi_val_display");
    bmiValDesc = document.getElementById("bmi_val_description");
    weightInput = document.getElementById("weight_input");
    heightInput = document.getElementById("height_input");
    hs_table_contents = document.getElementById("history_table_contents");
    clr_all_btn = document.getElementById("clear_all_btn");
    age_chk_confirm_btn = document.getElementById("age_check_confirm_btn");
    measurment_sys_radios = document.querySelectorAll('input[name="sys"]');
    // weight categories
    underweight_cat = document.getElementById("underweight_category");
    normal_cat = document.getElementById("normal_category");
    overweight_cat = document.getElementById("overweight_category");
    obese_cat = document.getElementById("obese_category");
    // weight categories titles
    underweight_cat_title = document.getElementById("uw_cat_title");
    normal_cat_title = document.getElementById("normal_cat_title");
    overweight_cat_title = document.getElementById("ow_cat_title");
    obese_cat_title = document.getElementById("obese_cat_title");
    // hook the callback function onSysChange to all the radios in sys radio group
    measurment_sys_radios.forEach((radio, k, p) => {
        radio.addEventListener('change', onSysChange);
    });
    // bind the age check confirmation button to its function
    age_chk_confirm_btn.addEventListener("click", onAgeCheckConfirm);
    // hook calcBtn onClick event to calcBMI function
    calcBtn.addEventListener("click", calculateBMI);
    // hook onClrAllBtnClick 
    clr_all_btn.addEventListener("click", onClrAllBtnClick);
    // call the history loader
    onLoadHistoryLoader();
}


// wait for DOM Content loaded first.
document.addEventListener("DOMContentLoaded", onLoad);