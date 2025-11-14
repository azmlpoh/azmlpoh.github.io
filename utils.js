function showNotification(message) {
	const notification = document.getElementById('notification');
	notification.textContent = message;
	notification.classList.add('active');

	setTimeout(() => {
		notification.classList.remove('active');
	}, 3000);
}