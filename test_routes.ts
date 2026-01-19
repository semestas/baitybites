
const test = await fetch("http://localhost:3000/test-login");
console.log("Test-login status:", test.status, await test.text());

const login = await fetch("http://localhost:3000/login.html");
console.log("Login status:", login.status);
