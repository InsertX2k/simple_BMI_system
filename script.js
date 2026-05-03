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



var calcBtn = null;
var bmiValDisplay = null;
var bmiValDesc = null;
var weightInput = null;
var heightInput = null;
var hs_table_contents = null;
var clr_all_btn = null;

// db connection object
var dbConnection = null;

// 2D Array of BMI Values history
var hs = null;




// calculate BMI Function
// the formula is: weight / height**2 (where height is in meters)
// to convert height from meters to centimeters, divide by 100
function calculateBMI(params) {
    var heightInMeters = heightInput.value / 100;
    console.log("debug: height in meters is: " + heightInMeters);
    // calculate the BMI
    var BMI_Value = (weightInput.value / (heightInMeters**2));
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
    if (BMI_Value < 18.5) {
        bmiValDesc.innerHTML = "Underweight";
    } else if (BMI_Value >= 18.5 && BMI_Value < 25) {
        bmiValDesc.innerHTML = "Normal";
    } else if (BMI_Value >= 25 && BMI_Value < 30) {
        bmiValDesc.innerHTML = "Overweight";
    } else {
        bmiValDesc.innerHTML = "Obese";
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
    // hook calcBtn onClick event to calcBMI function
    calcBtn.addEventListener("click", calculateBMI);
    // hook onClrAllBtnClick 
    clr_all_btn.addEventListener("click", onClrAllBtnClick);
    // call the history loader
    onLoadHistoryLoader();
}


// wait for DOM Content loaded first.
document.addEventListener("DOMContentLoaded", onLoad);