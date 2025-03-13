const getApi = async () => {
  try {
    const api = "http://127.0.0.1:8000";
    const response = await fetch(api);
    const apiData = await response.json();
    console.log(apiData);
  } catch (err) {
    console.log(err);
  }
};

getApi();
