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

    products.forEach((product, prodIndex) => {
        const index = imagesUrl.findIndex(imgUrl => (product.name.replace(/ /gi, '-') + '-deshibazaarbd').toLowerCase() === imgUrl.img_url.replace(/'/gi, '').toLowerCase().split('---')[0]);
        
        const matchedPhotos = imagesUrl.filter(imgUrl => {
            
            const imageUrl = imgUrl.img_url.replace(/'/gi, '').split('---')[0].toLowerCase();
            const pn = product.name.replace(/ /gi, '-').toLowerCase() + '-deshibazaarbd'; //pn - product name
            
            if(pn === imageUrl || pn + '-1' === imageUrl || pn + '-2' === imageUrl || pn + '-3' === imageUrl || pn + '-4' === imageUrl || pn + '-5' === imageUrl) {
                return true
            } else {
                return false
            }
        }).map(item => {
            return item.img_url.replace(/'/gi, '')
        })
        
        const featured_img = matchedPhotos.filter(img_url => {
            return (product.name.toLowerCase().replace(/ /gi, '-') + '-deshibazaarbd').includes(img_url.toLowerCase().split('---')[0])
        });
        const regular_img = matchedPhotos.filter(img_url => !product.name.replace(/ /gi, '-').includes(img_url.split('---')[0])); //@todo need to add regular_img in excel sheet
        
        if(index !== -1) {
            matched.push({...product, featured_image: featured_img.join(''), short_resolation_image: featured_img.join('')})
        } else {
            console.log('unmatched image => ', imagesUrl[prodIndex])
            unmatched.push({Product_Name: product.name, Image_Name: imagesUrl[prodIndex].img_url})
        }

    })
    console.log('-------------------------\n')

    const matchedCsv = JSONtoCSV(matched, { fields: ['business','name','unit','per_unit_value','brand','category','sub_category','sub_category2','price','is_offer_enable','offer_price','featured_image','short_resolation_image','type','keywords','alert_quantity','sku','delivery_time','status','enable_stock','current_stock','description','shipping_charge','image1','image2','image3','image4','image5','image6'] });
    fs.writeFile("./final-product.csv", matchedCsv).then(_ => console.log(`complete successfully: ${matched.length} products`)).catch(_ => console.log('something went wrong!'))
    
    const unmatchedCsv = JSONtoCSV(unmatched, { fields: ["Product_Name", "Image_Name"] });
    fs.writeFile("./final-product-unmatched.csv", unmatchedCsv).then(_ => console.log(`Have problem with ${unmatched.length} products`)).catch(_ => console.log('something went wrong!'))
    
})
