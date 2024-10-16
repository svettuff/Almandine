// Redirects to the profile creation page
function redirectCreateProfile() {
    window.location.href = 'createProfile.html';
}

// Redirects to the profile code verification page
function redirectEditProfile() {
    window.location.href = 'profileCodeVerification.html';
}

// Sends a request and handles errors
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

// Performs search and displays results
async function performSearch() {
    const searchQuery = document.getElementById('search').value;

    if (!searchQuery) {
        alert("Bitte geben Sie eine Suchanfrage ein"); // Please enter a search query
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
                        Ähnlichkeit: ${company.similarity}%
                    </div>
                    <div class="company-details hidden">
                        <p><strong>Branche:</strong> ${company.industry}</p>
                        <p><strong>Standort:</strong> ${company.location}</p>
                        <p><strong>Geschäftstyp:</strong> ${company.businessType}</p>
                        <p><strong>Kurze Beschreibung:</strong> ${company.description}</p>
                        <p><strong>Produkt-/Dienstleistungskategorie:</strong> ${company.productCategory}</p>
                        <p><strong>Hauptmerkmale:</strong> ${company.keyFeatures}</p>
                        <p><strong>Kundentyp:</strong> ${company.clientType}</p>
                        <p><strong>Markt:</strong> ${company.market}</p>
                        <p><strong>Haupttechnologien/Methoden:</strong> ${company.technologies}</p>
                        <p><strong>Schlüsselkompetenzen:</strong> ${company.competencies}</p>
                        <p><strong>Webseite:</strong> <a href="${company.website}" target="_blank">${company.website}</a></p>
                        <p><strong>E-Mail:</strong> ${company.email}</p>
                        <p><strong>Telefonnummer:</strong> ${company.phone}</p>
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
            alert('Keine passenden Unternehmen gefunden'); // No matching companies found
            companyContainer.classList.add('hidden');
        }
    } catch (error) {
        alert(error.message);
    }
}

// Toggles the panel display
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

// Smoothly scrolls to the panel
function scrollToPanel(panel) {
    panel.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// Hides other panels when clicking outside
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

// Creates a profile
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
            alert('Ungültige UID: Unternehmen mit dieser UID wurde nicht gefunden.'); // Invalid UID
        } else {
            alert(`Unerwartete Antwort: ${uidCheckResponse.message || "Keine Nachricht angegeben"}`); // Unexpected response
        }
    } catch (error) {
        console.error("Error in sendFormData:", error);
        alert(`Fehler: ${error.message}`);
    }
}

// Initiates a Stripe checkout session
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

// Verifies the profile code
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
            sessionStorage.setItem('stripeStatus', result.profile.stripeStatus);
            sessionStorage.setItem('stripeCustomer', result.profile.stripeCustomer);
            window.location.href = 'editProfile.html';
        } else {
            alert("Falscher Verifizierungscode! Versuchen Sie es erneut."); // Incorrect verification code! Try again
        }
    } catch (error) {
        console.error("Error in verifyProfileCode:", error);
        alert(`Fehler: ${error.message}`);
    }
}

// Edits the profile
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
            alert("Profil erfolgreich bearbeitet!"); // Profile edited successfully!
        } else {
            alert("Profilbearbeitung fehlgeschlagen."); // Failed to edit profile
        }
    } catch (error) {
        console.error("Error in editProfile:", error);
        alert(`Fehler: ${error.message}`);
    }
}

// Retries payment if needed
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
            alert(result.error || "Fehler bei der Erstellung der Zahlungssitzung. Bitte versuchen Sie es erneut."); // Error creating payment session
        }
    } catch (error) {
        console.error("Error in retryPayment:", error);
        alert("Zahlungssitzung konnte nicht erstellt werden."); // Failed to create payment session
    }
}

// Deletes profile and unsubscribes
async function deleteProfileAndUnsubscribe() {
    const confirmDelete = confirm("Sind Sie sicher, dass Sie Ihr Profil löschen und Ihr Abonnement kündigen möchten?"); // Are you sure you want to delete your profile and unsubscribe?
    if (!confirmDelete) {
        alert("Löschung abgebrochen."); // Deletion cancelled
        return;
    }

    const customer_id = sessionStorage.getItem('stripeCustomer');
    if (!customer_id) {
        alert("Kunden-ID nicht gefunden. Profil konnte nicht gelöscht werden."); // Customer ID not found. Unable to delete profile
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
            alert("Ihr Profil und Abonnement wurden erfolgreich gelöscht."); // Your profile and subscription have been successfully deleted
            sessionStorage.clear();
            window.location.href = "index.html";
        } else {
            alert(result.error || "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."); // An error occurred. Please try again
        }
    } catch (error) {
        console.error("Error in deleteUserProfileAndUnsubscribe:", error);
        alert("Profil konnte nicht gelöscht werden. Bitte versuchen Sie es erneut."); // Failed to delete profile
    }
}
