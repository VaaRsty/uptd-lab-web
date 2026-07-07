(function() {
    if (typeof io !== 'undefined') {
        const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || 
            (document.cookie.match(/token=([^;]+)/) || [])[1];
        if (!token) return;
        
        let user;
        try { user = JSON.parse(localStorage.getItem('user')); } catch(e) {}
        
        const base = window.__APP_CONFIG__?.API_BASE_URL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (typeof backendUrl !== 'undefined' ? backendUrl : 'http://localhost:5000/api'));
        const serverUrl = base.replace(/\/api$/, '') || 'http://localhost:5000';
        
        const socket = io(serverUrl, { withCredentials: true });

        socket.on('connect', () => {
            console.log('Socket.IO Connected:', socket.id);
            if (user && user.role === 'admin') {
                socket.emit('join_admin');
            } else if (user && user.id) {
                socket.emit('join_room', user.id);
            }
        });

        socket.on('new_notification', (data) => {
            console.log('New notification via socket:', data);
            window.dispatchEvent(new CustomEvent('socket_notification', { detail: data }));
        });
    }
})();
