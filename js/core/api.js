const API_URL = 'https://your-server.com/api';

export async function sendSensorData(data){

  const response = await fetch(
    `${API_URL}/sensors`,
    {
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify(data)
    }
  );

  return response.json();

}