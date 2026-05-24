const API_URL = process.env.BACKEND ?? "http:/localhost:3030";

export async function sendSensorData(data) {
  const response = await fetch(`${API_URL}/sensors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
}
