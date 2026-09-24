const payload = {
  action: "create",
  rota: "criterio",
  idAutorizacao: "90e61f39-0348-4a68-893f-ceaf166c0bf9",
  cabecalhos: ["TEXTO", "UUID TIPO", "UUID PESO"],
  valores: ["Via Cabecalhos", "cinco", "10"]
};

fetch("https://script.google.com/macros/s/AKfycbz2fNpg8Ab5djEmFvD7TE56-G3q0U__0YpeCeINJPN-2izyxVDiWaUl5vbdQERV3tJE/exec", {
  method: "POST",
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log("Success:", data))
.catch(err => console.error("Error:", err));
