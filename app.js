const CSVtoJSON = require('csvtojson');
const JSONtoCSV = require('json2csv').parse;
const fs = require('fs-extra');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, new Date().getTime() + '--' + file.originalname.replace(/ /gi, '-'))
    }
})

const upload = multer({storage: fileStorage})

app.use(upload.fields([{name: 'product_file', maxCount: 1}, {name: 'image_file', maxCount: 1}]));
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/process-matched', express.static(path.join(__dirname, 'process-matched')))
app.use('/process-unmatched', express.static(path.join(__dirname, 'process-unmatched')))

app.get('/',(req, res, next) => {
    res.send(`
        <div style="font-family: sans-serif; display: flex; justify-content: center; flex-direction: column; align-items: center; font-size: 40px">
            <h1>Process Your csv</h1>
            <div>
                <form action="/upload" method="POST" enctype="multipart/form-data">
                    <div style="margin-bottom: 80px">
                        <label style="cursor: pointer;" for="product_file">Products Csv</label>
                        <input type="file" name="product_file" id="product_file" accept=".csv" required>
                    </div>
                    <div style="margin-bottom: 20px">
                        <label style="cursor: pointer;" for="image_file">Image Url Csv</label>
                        <input type="file" name="image_file" id="image_file" accept=".csv" required>
                    </div>
                    <button type="submit" style="padding: 20px 60px; font-size: 40px; cursor: pointer; margin-top: 50px" >Upload</button>
                </form>
            </div>
        </div>
    `)
})



app.post('/upload', (req, res, next) => {
    const files = req.files
    const productFile = files.product_file[0].path;
    const imageFile = files.image_file[0].path;

    const productsCSV = CSVtoJSON().fromFile(`./${productFile}`);
    const imageUrlCSV = CSVtoJSON().fromFile(`./${imageFile}`);
    
    Promise.all([productsCSV, imageUrlCSV])
    .then(values => {
        const matched = [];
        const unmatched = [];
    
        const products = values[0];
        const imagesUrl = values[1];
    
        products.forEach((product, prodIndex) => {
            if(!product.name) return;

            if(product.business === '') {
                unmatched.push({Product_Name: product.name, Image_Name: 'none', required_issue: '1', business: '1', unit: '0', brand: '0', category: '0', sub_category: '0', price: '0'})
                return;
            } else if(product.unit === '') {
                unmatched.push({Product_Name: product.name, Image_Name: 'none', required_issue: '1', business: '0', unit: '1', brand: '0', category: '0', sub_category: '0', price: '0'})
                return;
            } else if(product.brand === '') {
                unmatched.push({Product_Name: product.name, Image_Name: 'none', required_issue: '1', business: '0', unit: '0', brand: '1', category: '0', sub_category: '0', price: '0'})
                return;
            } else if(product.category === '') {
                unmatched.push({Product_Name: product.name, Image_Name: 'none', required_issue: '1', business: '0', unit: '0', brand: '0', category: '1', sub_category: '0', price: '0'})
                return;
            } else if(product.sub_category === '') {
                unmatched.push({Product_Name: product.name, Image_Name: 'none', required_issue: '1', business: '0', unit: '0', brand: '0', category: '0', sub_category: '1', price: '0'})
                return;
            } else if(product.price === '') {
                unmatched.push({Product_Name: product.name, Image_Name: 'none', required_issue: '1', business: '0', unit: '0', brand: '0', category: '0', sub_category: '0', price: '1'})
                return;
            }

            const index = imagesUrl.findIndex((imgUrl, index) => {
                if(processProductName(product.name) === processImgUrl(imgUrl.image_url)) {
                    return true;
                } else {
                    return false;
                }
            });

            const matchedPhotos = imagesUrl.filter(imgUrl => {
                const imageUrl = processImgUrl(imgUrl.image_url).split('-');
                imageUrl.splice(imageUrl.length - 1, 1); // form remove -deshibazaarbd from array
                const pn = processProductName(product.name).split('-');
                pn.splice(pn.length - 1, 1); // form remove -deshibazaarbd from array
                
                const pnWithoutDeshibazaarbd = pn.join('-')
                const imageUrlWithoutDeshibazaarbd = imageUrl.join('-')

                if(pnWithoutDeshibazaarbd === imageUrlWithoutDeshibazaarbd || pnWithoutDeshibazaarbd + '-1' === imageUrlWithoutDeshibazaarbd || pnWithoutDeshibazaarbd + '-2' === imageUrlWithoutDeshibazaarbd || pnWithoutDeshibazaarbd + '-3' === imageUrlWithoutDeshibazaarbd || pnWithoutDeshibazaarbd + '-4' === imageUrlWithoutDeshibazaarbd || pnWithoutDeshibazaarbd + '-5' === imageUrlWithoutDeshibazaarbd) {
                    return true
                } else {
                    return false
                }
            }).map(item => {
                return item.image_url.replace(/'/gi, '')
            })
            
            const featured_img = matchedPhotos.filter(image_url => {
                return processProductName(product.name).includes(processImgUrl(image_url))
            });

            const regular_img = matchedPhotos.filter(image_url => !processProductName(product.name).includes(processImgUrl(image_url))); //@todo need to add regular_img in excel sheet
            
            let regular_imgObj = {};

            regular_img.forEach((img, index) => {
                regular_imgObj[`image${index+1}`] = img
            })

            if(index !== -1) {
                matched.push({...product, featured_image: featured_img.join(''), short_resolation_image: featured_img.join(''), ...regular_imgObj})
            } else {
                unmatched.push({Product_Name: product.name, Image_Name: imagesUrl[prodIndex] && imagesUrl[prodIndex].img_url ? imagesUrl[prodIndex].img_url : 'not found', required_issue: '0', business: '0', unit: '0', brand: '0', category: '0', sub_category: '0', price: '0'})
            }
    
        })

        const matchedProcessedFile = 'Processed-product--' + new Date().getTime() + '.csv';
        const unmatchedProcessedFile = 'Processed-unmatched-product--' + new Date().getTime() + '.csv';
    
        const matchedCsv = JSONtoCSV(matched, { fields: ['business','name','unit','per_unit_value','brand','category','sub_category','sub_category2','price','is_offer_enable','offer_price','featured_image','short_resolation_image','type','keywords','alert_quantity','sku','delivery_time','status','enable_stock','current_stock','description','shipping_charge','image1','image2','image3','image4','image5','image6'] });
        const unmatchedCsv = JSONtoCSV(unmatched, { fields: ["Product_Name", "Image_Name", "required_issue", "business", "unit", "brand", "category", "sub_category", "price"] });

        const processedMatchedWrite =  fs.writeFile(`./process-matched/${matchedProcessedFile}`, matchedCsv)
        const processedUnmatchedWrite = fs.writeFile(`./process-unmatched/${unmatchedProcessedFile}`, unmatchedCsv)

        Promise.all([processedMatchedWrite, processedUnmatchedWrite])
        .then(_ => {
            res.send(`
                <main style="font-size: 40px; text-align: center">
                    <h1>Download processed CSV files</h1>
                    <div style="margin-bottom: 20px">
                        <p style="color: lime; font-weight: bold">complete successfully: ${matched.length} products</p>
                        <a href="/process-matched/${matchedProcessedFile}">Download Product Csv</a>
                    </div>
        
                    <div style="margin-bottom: 20px">
                        <p style="color: red; font-weight: bold">Have problem with ${unmatched.length} products</p>
                        <a href="/process-unmatched/${unmatchedProcessedFile}">Download Unmatched Csv</a>
                    </div>
                    
                    <div style="margin-bottom: 20px">
                        <a href="/">Back to homepage</a>
                    </div>
                </main>
            `);
        })
        .catch(err => {
            console.log('file save err => ', err)
            res.send(`
                <main style="font-size: 40px; text-align: center">
                    <h1>Something went wrong</h1>
                    <p>File save catch block</p>
                    <div style="margin-bottom: 20px">
                        <a href="/">Back to homepage</a>
                    </div>
                </main>
            `);
        })
    })
    .catch(err => {
        console.log('error => ', err)
        res.send(`
            <main style="font-size: 40px; text-align: center">
                <h1>Something went wrong</h1>
                <p>Main catch block</p>
                <div style="margin-bottom: 20px">
                    <a href="/">Back to homepage</a>
                </div>
            </main>
        `);
    })
});

function processProductName(pn) {
    return pn.toLowerCase().replace(/-/gi, ' ').replace(/\s+/g, ' ').trim().replace(/ /gi, '-') + '-deshibazaarbd';
};

function processImgUrl(imgUrl) {
    return imgUrl.replace(/'/gi, '').split('---')[0].toLowerCase()
};

app.listen(5050);