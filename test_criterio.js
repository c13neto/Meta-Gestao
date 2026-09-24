const baseUrl = "https://script.google.com/macros/s/AKfycbz2fNpg8Ab5djEmFvD7TE56-G3q0U__0YpeCeINJPN-2izyxVDiWaUl5vbdQERV3tJE/exec";
const idAutorizacao = "90e61f39-0348-4a68-893f-ceaf166c0bf9";
fetch(`${baseUrl}?rota=criterio&idAutorizacao=${idAutorizacao}`).then(r=>r.json()).then(res => console.log(JSON.stringify(res.devMsg, null, 2)));
