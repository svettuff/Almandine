function redirectCreateProfile() {
    window.location.href = 'createProfile.html';
}

function redirectEditProfile() {
    window.location.href = 'profileCodeVerification.html';
}

async function sendRequest(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        console.log(`Response status for ${url}:`, response.status);

        if (response.ok) {
            const result = await response.json();
            console.log(`Response data from ${url}:`, result);
            return result;
        } else {
            const errorText = await response.text();
            console.error(`Error from server: ${errorText}`);
            throw new Error(`Server error: ${errorText}`);
        }
    } catch (error) {
        console.error('Error in sendRequest:', error);
        throw error;
    }
}

async function performSearch() {
    const searchQuery = document.getElementById('search').value;

    if (!searchQuery) {
        alert("Please enter a search query");
        return;
    }

    try {
        const result = await sendRequest('https://server.almandine.ch:5000/find-company', { query: searchQuery });

        document.querySelector('.title-container').classList.add('slide-up');
        document.querySelector('.search-container').classList.add('slide-up');
        document.querySelector('.profile-container').classList.add('slide-up');

        const companyContainer = document.getElementById('company-container');
        companyContainer.innerHTML = '';

        if (result.companies && Array.isArray(result.companies) && result.companies.length > 0) {
            result.companies.forEach(company => {
                const companyPanel = document.createElement('div');
                companyPanel.classList.add('company-panel', 'slide-in-up');

                companyPanel.innerHTML = `
                    <div class="company-brief">
                        <strong>${company.companyName}</strong><br>
                        Similarity: ${company.similarity}%
                    </div>
                    <div class="company-details hidden">
                        <p><strong>Industry:</strong> ${company.industry}</p>
                        <p><strong>Location:</strong> ${company.location}</p>
                        <p><strong>Business Type:</strong> ${company.businessType}</p>
                        <p><strong>Description:</strong> ${company.description}</p>
                        <p><strong>Product Category:</strong> ${company.productCategory}</p>
                        <p><strong>Key Features:</strong> ${company.keyFeatures}</p>
                        <p><strong>Client Type:</strong> ${company.clientType}</p>
                        <p><strong>Market:</strong> ${company.market}</p>
                        <p><strong>Technologies:</strong> ${company.technologies}</p>
                        <p><strong>Competencies:</strong> ${company.competencies}</p>
                        <p><strong>Website:</strong> <a href="${company.website}" target="_blank">${company.website}</a></p>
                        <p><strong>Email:</strong> ${company.email}</p>
                        <p><strong>Phone:</strong> ${company.phone}</p>
                    </div>
                `;

                companyPanel.addEventListener('click', () => {
                    togglePanel(companyPanel);
                    scrollToPanel(companyPanel);
                });

                companyContainer.appendChild(companyPanel);
            });

            companyContainer.classList.remove('hidden');
        } else {
            alert('No matching companies found');
            companyContainer.classList.add('hidden');
        }
    } catch (error) {
        alert(error.message);
    }
}

function togglePanel(panel) {
    const allPanels = document.querySelectorAll('.company-panel');
    const isActive = panel.classList.contains('active');

    allPanels.forEach(p => {
        p.classList.remove('active');
        p.querySelector('.company-brief').classList.remove('hidden');
        p.querySelector('.company-details').classList.add('hidden');
    });

    if (!isActive) {
        panel.classList.add('active');
        panel.querySelector('.company-brief').classList.add('hidden');
        panel.querySelector('.company-details').classList.remove('hidden');
    }
}

function scrollToPanel(panel) {
    panel.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

document.addEventListener('click', (event) => {
    const isCompanyPanel = event.target.closest('.company-panel');
    if (!isCompanyPanel) {
        document.querySelectorAll('.company-panel').forEach(panel => {
            panel.classList.remove('active');
            panel.querySelector('.company-brief').classList.remove('hidden');
            panel.querySelector('.company-details').classList.add('hidden');
        });
    }
});

async function createProfile(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    try {
        const uidCheckResponse = await sendRequest('https://server.almandine.ch:5000/check-uid', { uid: data.id });

        if (uidCheckResponse.message === "exist") {
            const result = await sendRequest('https://server.almandine.ch:5000/create-company-profile', data);
            await initiateStripeCheckout(data.id);
        } else if (uidCheckResponse.message === "UID does not exist.") {
            alert('Invalid UID: Company with this UID was not found.');
        } else {
            alert(`Unexpected response: ${uidCheckResponse.message || "No message provided"}`);
        }
    } catch (error) {
        console.error("Error in sendFormData:", error);
        alert(`Error: ${error.message}`);
    }
}

async function initiateStripeCheckout(uid) {
    try {
        const response = await fetch("https://server.almandine.ch:5000/create-checkout-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ uid })
        });

        const { url } = await response.json();

        if (url) {
            window.location = url;
        } else {
            console.error("No URL returned from session creation.");
        }
    } catch (e) {
        console.error("Error initiating Stripe checkout:", e.message);
    }
}

async function verifyProfileCode(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    try {
        const result = await sendRequest('https://server.almandine.ch:5000/verify-profile-code', { code: data.code });

        if (result.message === "Code verified") {
            sessionStorage.setItem('profileData', JSON.stringify(result.profile));
            sessionStorage.setItem('profileId', result.profile._id);
            sessionStorage.setItem('stripeStatus', result.profile.stripeStatus)
            sessionStorage.setItem('stripeCustomer', result.profile.stripeCustomer)
            window.location.href = 'editProfile.html';
        } else {
            alert("Incorrect verification code! Try again.");
        }
    } catch (error) {
        console.error("Error in verifyProfileCode:", error);
        alert(`Error: ${error.message}`);
    }
}

async function editProfile(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    data._id = sessionStorage.getItem('profileId');

    try {
        const result = await sendRequest('https://server.almandine.ch:5000/edit-profile', data);

        if (result.message === "Profile edited successfully") {
            alert("Profile edited successfully!");
        } else {
            alert("Failed to edit profile.");
        }
    } catch (error) {
        console.error("Error in editProfile:", error);
        alert(`Error: ${error.message}`);
    }
}

async function retryPayment(formId) {
    const customer_id = sessionStorage.getItem('stripeCustomer');
    if (customer_id === "undefined") {
        const form = document.getElementById(formId);
        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = value;
        });
        await initiateStripeCheckout(data.id);
        return;
    }

    try {
        const response = await fetch('https://server.almandine.ch:5000/retry-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ customer_id })
        });

        const result = await response.json();

        if (result.url) {
            window.location.href = result.url;
        } else {
            alert(result.error || "Error creating payment session. Please try again.");
        }
    } catch (error) {
        console.error("Error in retryPayment:", error);
        alert("Failed to create payment session.");
    }
}

async function deleteProfileAndUnsubscribe() {
    const confirmDelete = confirm("Are you sure you want to delete your profile and unsubscribe?");
    if (!confirmDelete) {
        alert("Deletion cancelled.");
        return;
    }

    const customer_id = sessionStorage.getItem('stripeCustomer');
    if (!customer_id) {
        alert("Customer ID not found. Unable to delete profile.");
        return;
    }

    try {
        const response = await fetch('https://server.almandine.ch:5000/delete-profile-and-unsubscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ customer_id })
        });

        const result = await response.json();

        if (result.status === "success") {
            alert("Your profile and subscription have been successfully deleted.");
            sessionStorage.clear();
            window.location.href = "index.html";
        } else {
            alert(result.error || "An error occurred. Please try again.");
        }
    } catch (error) {
        console.error("Error in deleteUserProfileAndUnsubscribe:", error);
        alert("Failed to delete profile. Please try again.");
    }
}
