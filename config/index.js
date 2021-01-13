import React, { useState, useEffect } from "react";
import { render } from "react-dom";
import { json } from "@highpoint/js-fetch";

const App = () => {
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState();
  useEffect(() => {
    setLoading(true)
    json("InitialData").then(newData => {setInitialData(newData); setLoading(false)}).catch(e => setLoading(false));
  }, []);
  return (
    <>
      <div>hello world!</div>
      {loading && <div>Loading...</div>}
      {initialData && (
        <div>initial data: {JSON.stringify(initialData, null, 2)}</div>
      )}
    </>
  );
};

render(<App />, document.getElementById("app"));
