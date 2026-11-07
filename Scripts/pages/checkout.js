import { showNotification } from '../services/notifications.js';

document.addEventListener('DOMContentLoaded', () => {
    const storedProduct = sessionStorage.getItem('buy_now_item');
    if (!storedProduct) {
        window.location.replace('sales_page.html');
        return;
    }

    try {
        const checkout = JSON.parse(storedProduct);
        const product = JSON.parse(checkout.product);
        const name = document.getElementById('pname');
        const price = document.getElementById('pprice');
        const condition = document.getElementById('pcond');
        const image = document.getElementById('pimg');

        name.textContent = product.name || 'Selected item';
        price.textContent = `€ ${checkout.total_price}`;
        condition.textContent = `Condition: ${product.condition || 'Not specified'}`;
        image.src = product.image || 'Images/13.png';
        image.alt = product.name ? `Preview of ${product.name}` : 'Product preview';

        document.querySelector('.contact-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            showNotification(
                'Seller inquiries are not connected in this demo. Please use the Contact page instead.',
                'warning'
            );
        });
    } catch (error) {
        console.error('Unable to load the selected checkout item:', error);
        window.location.replace('sales_page.html');
    }
});
