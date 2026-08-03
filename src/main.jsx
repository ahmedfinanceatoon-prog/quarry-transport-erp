import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
 import * as XLSX from "xlsx";

function exportTableToExcel(tableId, fileName) {
  const table = document.getElementById(tableId);
  const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
  XLSX.writeFile(workbook, fileName + ".xlsx");
}

  <React.StrictMode>
    <App />
  </React.StrictMode>
);
