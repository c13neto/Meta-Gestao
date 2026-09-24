const query = `action=login&email=${encodeURIComponent('admin@admin.com')}&senha=${encodeURIComponent('123')}`;
const params = new URLSearchParams(query);
console.log(params.get('email'));
console.log(params.get('senha'));
