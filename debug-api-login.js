
async function testLogin() {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "curie@gmail.com",
                password: "curie@gmail.com"
            }),
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", data);

    } catch (error) {
        console.error("Error:", error);
    }
}

testLogin();
