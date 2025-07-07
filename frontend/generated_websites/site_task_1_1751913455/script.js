function showAlert() {
    alert('This website was actually created by ALI!');
    console.log('ALI generated website is working!');
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully at:', new Date());
    
    // FILE REMOVED: Obsolete generated website deleted per ali_development_schedule.md. No longer part of production code. Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});