const CSVtoJSON = require('csvtojson');
const JSONtoCSV = require('json2csv').parse;
const fs = require('fs-extra');

const products = CSVtoJSON().fromFile("./products.csv");
const imageUrl = CSVtoJSON().fromFile("./image_url.csv"); 


// Recommended way to merge product img url with product;

Promise.all([products, imageUrl]).then(values => {
    const matched = [];
    const unmatched = [];

    const products = values[0];
    const imagesUrl = values[1];

    products.reverse().forEach(product => {
        const index = imagesUrl.findIndex(imgUrl => product.product_name === imgUrl.img_url.split('--')[0]);

        if(index !== -1) {
            matched.push({...product, img_url: imagesUrl[index].img_url})
        } else {
            unmatched.push({product_name: product.product_name})
        }
    })

    const matchedCsv = JSONtoCSV(matched, { fields: ["product_name", "price", "img_url"] });
    fs.writeFile("./final-product.csv", matchedCsv).then(_ => console.log('matched successful')).catch(_ => console.log('something went wrong!'))
    
    const unmatchedCsv = JSONtoCSV(unmatched, { fields: ["product_name"] });
    fs.writeFile("./final-product-unmatched.csv", unmatchedCsv).then(_ => console.log('unmatched successful')).catch(_ => console.log('something went wrong!'))
    
})



// Another way to merge product url with product. But there is no support for unmatched img url handling

// Promise.all([products, imageUrl]).then(values => {
//     let finalizeArr;
//     const products = values[0];
//     const imagesUrl = values[1];

//     finalizeArr = imagesUrl.reverse().map(imageUrl => {

//         const imgName = imageUrl.img_url.split('--')[0]

//         for (let index = 0; index < products.length; index++) {
//             const product = products[index];

//             if(product.product_name === imgName) {
//                 product.img_url = imageUrl.img_url
//                 return product;
//             }
//         }


//     })

//     console.log(finalizeArr.filter(item => item !== undefined))
// })