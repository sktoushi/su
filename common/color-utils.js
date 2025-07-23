async function getRandomColor() {
    try {
        const response = await fetch('pantone-colors.json');
        const pantoneData = await response.json();
        const { names, values } = pantoneData;
        if (!names || !values || names.length !== values.length) {
            throw new Error('Invalid pantone-colors.json format. "names" and "values" must be parallel arrays.');
        }
        const randomIndex = Math.floor(getSecureRandomNumber() * names.length);
        const randomName = names[randomIndex];
        const randomValue = values[randomIndex];
        document.body.style.backgroundColor = randomValue;
        const colorDisplay = document.getElementById('pantoneColorDisplay');
        if (colorDisplay) {
            colorDisplay.textContent = `${randomName} (${randomValue})`;
        }
        window.lastPantoneColor = randomValue;
        return randomValue;
    } catch (error) {
        console.error('Error fetching pantone-colors.json:', error);
        document.body.style.backgroundColor = '#ffffff';
        window.lastPantoneColor = '#ffffff';
        return '#ffffff';
    }
}
