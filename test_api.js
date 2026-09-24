const idAutorizacao = "90e61f39-0348-4a68-893f-ceaf166c0bf9";
const baseUrl = "https://script.google.com/macros/s/AKfycbz2fNpg8Ab5djEmFvD7TE56-G3q0U__0YpeCeINJPN-2izyxVDiWaUl5vbdQERV3tJE/exec";

Promise.all([
  fetch(`${baseUrl}?rota=tarefa&idAutorizacao=${idAutorizacao}`).then(r=>r.json()),
  fetch(`${baseUrl}?rota=atividade&idAutorizacao=${idAutorizacao}`).then(r=>r.json()),
  fetch(`${baseUrl}?rota=conclusao&idAutorizacao=${idAutorizacao}`).then(r=>r.json())
]).then(results => {
  console.log("tarefa:", !!results[0].sucesso, results[0].devMsg ? results[0].devMsg.length : 0);
  console.log("atividade:", !!results[1].sucesso, results[1].devMsg ? results[1].devMsg.length : 0);
  console.log("conclusao:", !!results[2].sucesso, results[2].devMsg ? results[2].devMsg.length : 0);
});
