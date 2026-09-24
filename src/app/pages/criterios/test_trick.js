async function testUpdateTrick() {
  // 1. Create a blank row
  const createPayload = {
    action: "create",
    rota: "criterio",
    idAutorizacao: "90e61f39-0348-4a68-893f-ceaf166c0bf9"
  };
  
  const createRes = await fetch("https://script.google.com/macros/s/AKfycbz2fNpg8Ab5djEmFvD7TE56-G3q0U__0YpeCeINJPN-2izyxVDiWaUl5vbdQERV3tJE/exec", {
    method: "POST",
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(createPayload)
  }).then(r => r.json());
  
  console.log("Create response:", createRes);
  const newId = createRes.devMsg.split("ID: ")[1];
  console.log("New ID:", newId);
  
  // 2. Update the row with specific cabecalhos
  const updatePayload = {
    action: "update",
    rota: "criterio",
    id: newId,
    idAutorizacao: "90e61f39-0348-4a68-893f-ceaf166c0bf9",
    cabecalhos: ["TEXTO", "UUID TIPO", "UUID PESO"],
    modificacoes: ["Hack Funciona!", "cinco", "165795a4-714f-4cad-924e-c831241d4f54"]
  };
  
  const updateRes = await fetch("https://script.google.com/macros/s/AKfycbz2fNpg8Ab5djEmFvD7TE56-G3q0U__0YpeCeINJPN-2izyxVDiWaUl5vbdQERV3tJE/exec", {
    method: "POST",
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(updatePayload)
  }).then(r => r.json());
  
  console.log("Update response:", updateRes);
}

testUpdateTrick();
