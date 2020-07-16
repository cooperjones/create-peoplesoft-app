import React, { useState, useEffect } from "react";
import { render } from "react-dom";
import { json } from "@highpoint/js-fetch";

const App = () => {
  const [initialData, setInitialData] = useState();
  useEffect(() => {
    json("InitialData").then(newData => setInitialData(newData));
  }, []);
  return (
    <>
      <div>hello world!</div>
      {initialData && (
        <div>initial data: {JSON.stringify(initialData, null, 2)}</div>
      )}
    </>
  );
};

render(<App />, document.getElementById("app"));
