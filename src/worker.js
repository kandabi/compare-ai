self.addEventListener('message', async event => {
    const imageURL = event.data

    var reader = new FileReader();
    reader.readAsDataURL(imageURL);
    reader.onload = function (e) {
        self.postMessage(
            e.target.result
        )
    }    
}); 