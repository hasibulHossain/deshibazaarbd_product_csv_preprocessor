const CSVtoJSON = require('csvtojson');
const JSONtoCSV = require('json2csv').parse;
const fs = require('fs-extra');

const productsCSV = CSVtoJSON().fromFile("./products.csv");
const imageUrlCSV = CSVtoJSON().fromFile("./image_url.csv"); 

// Recommended way to merge multiple product img url with product;

Promise.all([productsCSV, imageUrlCSV]).then(values => {
    const matched = [];
    const unmatched = [];

    const products = values[0];
    const imagesUrl = values[1];

    products.forEach(product => {
        const index = imagesUrl.findIndex(imgUrl => product.product_name === imgUrl.img_url.split('---')[0]);
        
        const matchedPhotos = imagesUrl.filter(imgUrl => {
            
            const imageUrl = imgUrl.img_url.split('---')[0];
            const pn = product.product_name;
            
            if(pn === imageUrl || pn + '-1' === imageUrl || pn + '-2' === imageUrl || pn + '-3' === imageUrl || pn + '-4' === imageUrl || pn + '-5' === imageUrl) {
                return true
            } else {
                return false
            }
        }).map(item => {
            return item.img_url
        })

        const featured_img = matchedPhotos.filter(img_url => product.product_name.includes(img_url.split('---')[0]));
        const regular_img = matchedPhotos.filter(img_url => !product.product_name.includes(img_url.split('---')[0]));
        
        
        if(index !== -1) {
            matched.push({...product, featured_img: featured_img.join(''), product_img: regular_img.join(',')})
        } else {
            unmatched.push({product_name: product.product_name})
        }

        console.log(`Product name: ${product.product_name}, Image found: ${matchedPhotos.length}`);
    })
    console.log('-------------------------\n')

    const matchedCsv = JSONtoCSV(matched, { fields: ["product_name", "price", "featured_img", "product_img"] });
    fs.writeFile("./final-product.csv", matchedCsv).then(_ => console.log(`complete successfully: ${matched.length} products`)).catch(_ => console.log('something went wrong!'))
    
    const unmatchedCsv = JSONtoCSV(unmatched, { fields: ["product_name"] });
    fs.writeFile("./final-product-unmatched.csv", unmatchedCsv).then(_ => console.log(`Have problem with ${unmatched.length} products`)).catch(_ => console.log('something went wrong!'))
    
})