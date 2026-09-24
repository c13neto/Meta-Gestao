const { of, forkJoin, delay } = require('rxjs');

function criar(val) {
  console.log("criar called with", val);
  return of({ sucesso: true, val }).pipe(delay(100));
}

const obsList = [1, 2, 3].map(v => criar(v));

console.log("forkJoin starting");
forkJoin(obsList).subscribe({
  next: (res) => console.log("forkJoin next:", res),
  complete: () => console.log("forkJoin complete"),
  error: (err) => console.log("forkJoin error:", err)
});
