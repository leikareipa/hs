{
    const cards = Array.from(document.querySelectorAll(".product-card"));
    
    for (const card of cards) {
        card.onclick = ()=>card.classList.toggle("selected");
    }
}
