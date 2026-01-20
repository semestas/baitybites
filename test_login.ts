
const response = await fetch('http://localhost:9876/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
});

console.log('Status:', response.status);
const text = await response.text();
console.log('Body:', text);
