function performSearch() {
    const searchQuery = document.getElementById('search').value;
    alert("You searched for: " + searchQuery);
}

function createProfile() {
    window.location.href = 'profileForm.html';
}

function editProfile() {
    window.location.href = 'profileCodeCheck.html';
}