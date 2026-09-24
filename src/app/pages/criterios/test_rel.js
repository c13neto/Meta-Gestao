

async function testRelacional() {
  // 1. Create a Criterio
  let res = await fetch("https://script.google.com/macros/s/AKfycbz2fNpg8Ab5djEmFvD7TE56-G3q0U__0YpeCeINJPN-2izyxVDiWaUl5vbdQERV3tJE/exec", {
    method: "POST", body: JSON.stringify({ action: "create", rota: "criterio", idAutorizacao: "90e61f39-0348-4a68-893f-ceaf166c0bf9" })
  }).then(r => r.json());
  const critId = res.devMsg.split("ID: ")[1];
  
  await fetch("https://script.google.com/macros/s/AKfycbz2fNpg8Ab5djEmFvD7TE56-G3q0U__0YpeCeINJPN-2izyxVDiWaUl5vbdQERV3tJE/exec", {
    method: "POST", body: JSON.stringify({ action: "update", rota: "criterio", id: critId, idAutorizacao: "90e61f39-0348-4a68-893f-ceaf166c0bf9", cabecalhos: ["TEXTO", "UUID TIPO"], modificacoes: ["Criterio Linkado", "cinco"] })
  });

  // 2. Create Criterio-Opcoes with UUID CRITERIO
  res = await fetch("https://script.google.com/macros/s/AKfycbz2fNpg8Ab5djEmFvD7TE56-G3q0U__0YpeCeINJPN-2izyxVDiWaUl5vbdQERV3tJE/exec", {
    method: "POST", body: JSON.stringify({ action: "create", rota: "criterioOpcoes", idAutorizacao: "90e61f39-0348-4a68-893f-ceaf166c0bf9" })
  }).then(r => r.json());
  const optId = res.devMsg.split("ID: ")[1];
  
  await fetch("https://script.google.com/macros/s/AKfycbz2fNpg8Ab5djEmFvD7TE56-G3q0U__0YpeCeINJPN-2izyxVDiWaUl5vbdQERV3tJE/exec", {
    method: "POST", body: JSON.stringify({ action: "update", rota: "criterioOpcoes", id: optId, idAutorizacao: "90e61f39-0348-4a68-893f-ceaf166c0bf9", cabecalhos: ["UUID CRITERIO", "PESO", "AVALIAÇÃO"], modificacoes: [critId, "0", "Muito Ruim"] })
  });

  console.log("Done linking!");
}
testRelacional();
