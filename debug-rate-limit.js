
async function testRateLimit() {
    for (let i = 1; i <= 7; i++) {
        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: "curie@gmail.com", password: "wrong" }),
            });
            const data = await response.json();
            console.log(`Req ${i}: Status ${response.status}`, data);
        } catch (e) {
            console.error(e);
        }
    }
}

testRateLimit();
