// Testdaten
const state = [
  {
    title: "Einkaufen gehen",
    person: "Max",
    message: "Für das Wochenende einkaufen gehen",
  },
  {
    title: "Wohnung putzen",
    person: "Anna",
    message: "Küche und Kinderzimmer müssen aufgeräumt werden",
  },
  {
    title: "Müll raus bringen",
    person: "Max",
    message: "Jeden zweiten Tag muss mal der ganze Müll raus",
  },
];

// Datenbank öffnen
const dbRequest = window.indexedDB.open("myDB", 9);
let db = null;

// Datenbank EventHandling
dbRequest.addEventListener("upgradeneeded", (event) => {
  console.log("Upgrade from version", event.oldVersion, "to", event.newVersion);
  db = event.target.result;

  console.log(db.objectStoreNames);
  if (!db.objectStoreNames.contains("notes")) {
    let objectStore = db.createObjectStore("notes", {
      keyPath: "id",
      autoIncrement: true,
    });

    objectStore.createIndex("titleIDX", "title", { unique: false });
    objectStore.createIndex("personIDX", "person", { unique: false });
    objectStore.createIndex("dateIDX", "date", { unique: false });
  }

  //db.createObjectStore("test1234");
  if (db.objectStoreNames.contains("test1234")) {
    db.deleteObjectStore("test1234");
  }
});

dbRequest.addEventListener("success", (event) => {
  console.log("Success");
  db = event.target.result;

  if (typeof state !== "undefined") {
    let notes = makeTransaction("notes", "readwrite", () => {
      viewNoteList();
    });

    let request = notes.getAll();
    request.addEventListener("success", (event) => {
      if (event.target.result.length === 0) {
        state.forEach((data) => {
          data.date = Date.now();
          let addRequest = notes.add(data);
          addRequest.addEventListener("success", (event) => {
            console.log("added data");
          });
        });
      }
    });
  } else {
    viewNoteList();
  }
});

dbRequest.addEventListener("error", (event) => {
  console.log(event.target.error);
});

// Transaction
function makeTransaction(storeName, mode, callback = null) {
  let transaction = db.transaction(storeName, mode);
  transaction.addEventListener("error", (event) => {
    console.log(event.target.error);
  });
  transaction.addEventListener("complete", (event) => {
    console.log("Transaction Complete");
    if (typeof callback === "function") callback();
  });

  return transaction.objectStore(storeName);
}

// Alle Datensätze anzeigen (für Liste)
function viewNoteList() {
  let notes = makeTransaction("notes", "readonly");
  document.querySelector("#allNotes").innerHTML = "";

  //let cursorRequest = notes.openCursor(null, "prev");
  let range = IDBKeyRange.only("Anna");
  let index = notes.index("personIDX");
  let cursorRequest = index.openCursor(range, "next");

  cursorRequest.addEventListener("success", (event) => {
    let cursor = event.target.result;
    if (cursor) {
      document.querySelector("#allNotes").insertAdjacentHTML(
        "beforeend",
        `<div data-key="${cursor.value.id}" onclick="showNote(${cursor.value.id})" style="border: 1px solid black; margin-bottom: 16px;">
          <div>${cursor.value.title}</div>
        </div>`
      );
      cursor.continue();
    }
  });

  // let request = notes.getAll();
  // let range = IDBKeyRange.only("Anna");
  // let index = notes.index("personIDX");
  // let request = index.getAll(range);

  // request.addEventListener("success", (event) => {
  //   document.querySelector("#allNotes").innerHTML = "";
  //   let data = event.target.result;
  //   data.forEach((element) => {
  //     document.querySelector("#allNotes").insertAdjacentHTML(
  //       "beforeend",
  //       `<div data-key="${element.id}" onclick="showNote(${element.id})" style="border: 1px solid black; margin-bottom: 16px;">
  //       <div>${element.title}</div>
  //     </div>`
  //     );
  //   });
  // });
  // request.addEventListener("error", (event) => {
  //   console.log(event.target.error);
  // });
}

// Einen Datensatz anzeigen (für Formular)
function showNote(noteID) {
  let notes = makeTransaction("notes", "readonly");
  let request = notes.get(noteID);
  request.addEventListener("success", (event) => {
    let data = event.target.result;
    document.querySelector("#myForm").setAttribute("data-key", data.id);
    document.querySelector("#noteTitle").value = data.title;
    document.querySelector("#notePerson").value = data.person;
    document.querySelector("#noteMessage").value = data.message;
  });
  request.addEventListener("error", (event) => {
    console.log(event.target.error);
  });
}

// Neuen Datensatz anlegen
document.querySelector("#addNote").addEventListener("click", (event) => {
  event.preventDefault();

  let newNote = {
    title: document.querySelector("#noteTitle").value.trim(),
    person: document.querySelector("#notePerson").value.trim(),
    message: document.querySelector("#noteMessage").value.trim(),
    date: Date.now(),
  };

  let notes = makeTransaction("notes", "readwrite");

  let request = notes.add(newNote);
  request.addEventListener("success", (event) => {
    console.log(event.target.result);
    document.querySelector("#myForm").reset();
    viewNoteList();
  });
  request.addEventListener("error", (event) => {
    console.log(event.target.error);
  });
});

// Datensatz löschen
document.querySelector("#deleteNote").addEventListener("click", (event) => {
  event.preventDefault();
  let form = document.querySelector("#myForm");

  if (form.hasAttribute("data-key")) {
    let noteID = form.getAttribute("data-key");

    let notes = makeTransaction("notes", "readwrite");
    let request = notes.delete(parseInt(noteID));

    request.addEventListener("success", (event) => {
      document.querySelector(`div[data-key="${noteID}"]`).remove();
      form.reset();
      form.removeAttribute("data-key");
    });
    request.addEventListener("error", (event) => {
      console.log(event.target.error);
    });
  }
});

// Datensatz aktualisieren
document.querySelector("#updateNote").addEventListener("click", (event) => {
  event.preventDefault();
  let form = document.querySelector("#myForm");

  if (form.hasAttribute("data-key")) {
    let noteID = form.getAttribute("data-key");

    let note = {
      id: parseInt(noteID),
      title: document.querySelector("#noteTitle").value.trim(),
      person: document.querySelector("#notePerson").value.trim(),
      message: document.querySelector("#noteMessage").value.trim(),
      date: Date.now(),
    };

    let notes = makeTransaction("notes", "readwrite");
    let request = notes.put(note);
    request.addEventListener("success", (event) => {
      document.querySelector(
        `div[data-key="${noteID}"]`
      ).innerHTML = `<div>${note.title}</div>`;
    });
    request.addEventListener("error", (event) => {
      console.log(event.target.error);
    });
  }
});
