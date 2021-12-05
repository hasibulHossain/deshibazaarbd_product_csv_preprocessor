const CSVtoJSON = require('csvtojson');
const JSONtoCSV = require('json2csv').parse;
const fs = require('fs-extra');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + '----' + file.originalname.replace(/ /gi, '-'))
    }
})

const upload = multer({storage: fileStorage})

// app.use(upload.fields([{name: 'product_file', maxCount: 1}, {name: 'image_file', maxCount: 1}]));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/process-matched', express.static(path.join(__dirname, 'process-matched')))
app.use('/process-unmatched', express.static(path.join(__dirname, 'process-unmatched')))
app.use('/filtered-products', express.static(path.join(__dirname, 'filtered-products')))

app.get('/',(req, res, next) => {
    res.send(`
        <div style="font-family: sans-serif; display: flex; justify-content: center; flex-direction: column; align-items: center; font-size: 40px">
            <h1>Process Your csv</h1>
            <div style="display: flex">
                <div style="margin-bottom: 90px; margin-right: 20px">
                    <a href="/filter">Filter products</a>
                </div>
                <div style="margin-bottom: 90px; margin-right: 20px">
                    <a href="/history">Old Sheets</a>
                </div>
                <div style="margin-bottom: 90px; margin-right: 20px">
                    <a href="/track-uploads">Track uploaded products</a>
                </div>
            </div>
            <div>
                <form action="/upload" method="POST" enctype="multipart/form-data">
                    <div style="font-size: 20px; display: flex">
                        <div  style="margin-bottom: 80px; margin-right: 20px">
                            <label style="cursor: pointer;" for="name">Your Name</label>
                            <input style="padding: 10px" type="text" name="name" id="name" required>
                        </div>
                        <div  style="margin-bottom: 80px; margin-right: 20px">
                            <label style="cursor: pointer;" for="sheet">Sheet No</label>
                            <input style="padding: 10px" type="number" name="sheet" id="sheet" required>
                        </div>
                    </div>
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

app.get('/history', (req, res, next) => {
    fs.readFile('./db/db.json', (err, data) => {
        if(!err) {
            res.send(`
                <div style="font-family: sans-serif; display: flex; justify-content: center; flex-direction: column; align-items: center; font-size: 18px">
                    <a href="/">Back to homepage</a>
                    <div style="display: flex" >
                        <div style="width: 70%">
                            <h1>Products CSV</h1>
                            <ol>
                                ${JSON.parse(data)[0].data.reverse().map(item => `<li>
                                    <div>
                                        <p>${new Date(item.createdAt).toString().split('GMT')[0]}</p>
                                        <a href="/${item.path}">${item.path.split('----')[1]}</a>
                                    </div>
                                </li>`)}
                            </ol>
                        </div>
                        <div style="width: 70%">
                            <h1>Image CSV</h1>
                            <ol>
                                ${JSON.parse(data)[1].data.reverse().map(item => `<li>
                                    <div>
                                        <p>${new Date(item.createdAt).toString().split('GMT')[0]}</p>
                                        <a href="/${item.path}">${item.path.split('----')[1]}</a>
                                    </div>
                                </li>`)}
                            </ol>
                        </div>
                    </div>
                    <a href="/">Back to homepage</a>
                </div>
            `)
        }
    })
})

app.get('/track-uploads', (req, res, next) => {
    fs.readFile('./db/tracker.json', (err, data) => {
        if(!err) {
            const dataCSV   = JSON.parse(data)[0].data.reverse();

            const sortedArr =  dataCSV.sort(function(a, b) {
                var nameA = a.user_name.toUpperCase(); // ignore upper and lowercase
                var nameB = b.user_name.toUpperCase(); // ignore upper and lowercase

                if (nameA < nameB) {
                  return -1;
                }
                if (nameA > nameB) {
                  return 1;
                }

                return 0;
            });

            const totalCount = sortedArr.reduce((accumulator, currentValue) => accumulator + +currentValue.total_count, 0)

            res.send(`
                <html>
                <head>
                    <style>
                        table {
                            border-collapse: collapse;
                        }
                        
                        td, th {
                            border: 1px solid #dddddd;
                        }
                        
                        tr:nth-child(even) {
                            background-color: #dddddd;
                        }
                    </style>    
                </head>
                
                <body>
                    <div style="font-family: sans-serif; display: flex; justify-content: center; flex-direction: column; align-items: center; font-size: 18px">
                        <a href="/">Back to homepage</a>
                        <div style="width: 70%">
                            <h1 style="text-align: center">Uploaded Products History</h1>
                            <h3 style="text-align: center" >Total Uploaded Products ${totalCount}</h3>
                            ${
                                sortedArr.map((_) => `
                                        <table style="width: 100%; margin-bottom: 30px">
                                            <tr>
                                                <th style="text-align: left; padding: 10px 20px;">SL</th>
                                                <th style="text-align: left; padding: 10px 20px;">Date</th>
                                                <th style="text-align: left; padding: 10px 20px;">Name</th>
                                                <th style="text-align: left; padding: 10px 20px;">Sheet No</th>
                                                <th style="text-align: left; padding: 10px 20px;">Product count</th>
                                                <th style="text-align: left; padding: 10px 20px;">Uploaded product CSV</th>
                                            </tr>

                                            ${_.data.map((item, index) => `<tr>
                                                <td style="padding: 10px 20px; text-align: left">${index + 1}</td>
                                                <td style="padding: 10px 20px; text-align: left">${new Date(item.createdAt).toString().split('GMT')[0]}</td>
                                                <td style="padding: 10px 20px; text-align: left; text-transform: capitalize">${item.name}</td>
                                                <td style="padding: 10px 20px; text-align: left">${item.sheet}</td>
                                                <td style="padding: 10px 20px; text-align: left">${item.product_count}</td>
                                                <td style="padding: 10px 20px; text-align: left">
                                                    <a href="${item.path}">download sheet ${item.sheet}</a>
                                                </td>
                                                </tr>
                                                `)}
                                                <tr>
                                                    <td style="padding: 10px 20px; text-align: left"></td>
                                                    <td style="padding: 10px 20px; text-align: left"></td>
                                                    <td style="padding: 10px 20px; text-align: left"></td>
                                                    <td style="padding: 10px 20px; text-align: left; font-weight: bold">Total</td>
                                                    <td style="padding: 10px 20px; text-align: left; font-weight: bold">${_.total_count}</td>
                                                    <td style="padding: 10px 20px; text-align: left">
                                                    </td>
                                                </tr>
                                        </table>
                                    `)
                                }
                        </div>
                    </div>
                </body>
                </html>
            `)
        }
    })
})

app.get('/filter',(req, res, next) => {
    res.send(`
        <div style="font-family: sans-serif; display: flex; justify-content: center; flex-direction: column; align-items: center; font-size: 40px">
            <h1>Filter Products CSV</h1>
            <div>
                <form action="/filter" method="POST" enctype="multipart/form-data">
                    <div style="margin-bottom: 80px">
                        <label style="cursor: pointer;" for="product_file">New Products CSV</label>
                        <input type="file" name="product_file_new" id="product_file" accept=".csv" required>
                    </div>
                    <div style="margin-bottom: 20px">
                        <label style="cursor: pointer;" for="image_file">Old Products CSV</label>
                        <input type="file" name="product_file_old" id="image_file" accept=".csv" required>
                    </div>
                    <button type="submit" style="padding: 20px 60px; font-size: 40px; cursor: pointer; margin-top: 50px" >Upload</button>
                </form>
                <a href="/">Back to homepage</a>
            </div>
        </div>
    `)
})

app.post('/filter', upload.fields([{name: 'product_file_new', maxCount: 1}, {name: 'product_file_old', maxCount: 1}]), (req, res, next) => {
    const files = req.files
    const productFileNew = files.product_file_new[0].path;
    const productFileOld = files.product_file_old[0].path;

    const productsNewCSV = CSVtoJSON().fromFile(`./${productFileNew}`);
    const productsOldCSV = CSVtoJSON().fromFile(`./${productFileOld}`);

    Promise.all([productsNewCSV, productsOldCSV])
        .then(values => {
            const productsNew = values[0]
            const productsOld = values[1]

            const mergedProds = productsNew.filter(prod => {

                return !productsOld.some(oldProd => (oldProd.name === prod.name))
                // for (let index = 0; index < productsOld.length; index++) {
                //     const productOld = productsOld[index];
                //     if(!prod.name.includes(productOld.name)) {
                //         return true
                //     } else {
                //         return false
                //     }
                // }
            })

            const matchedProcessedFile = 'filtered-product--' + new Date().getTime() + '.csv';

            const matchedCsv = JSONtoCSV(mergedProds, { fields: ['business','name','unit','per_unit_value','brand','category','sub_category','sub_category2','price','is_offer_enable','offer_price','featured_image','short_resolation_image','type','keywords','alert_quantity','sku','delivery_time','status','enable_stock','current_stock','description','shipping_charge','image1','image2','image3','image4','image5','image6'] });

            const processedMatchedWrite =  fs.writeFile(`./filtered-products/${matchedProcessedFile}`, matchedCsv)

            processedMatchedWrite
            .then(_ => {
                res.send(`
                    <main style="font-size: 40px; text-align: center">
                        <h1>Download processed CSV files</h1>
                        <div style="margin-bottom: 20px">
                            <p style="color: lime; font-weight: bold">complete successfully: ${mergedProds.length} products</p>
                            <a href="/filtered-products/${matchedProcessedFile}">Download Product Csv</a>
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
});



app.post('/upload', upload.fields([{name: 'product_file', maxCount: 1}, {name: 'image_file', maxCount: 1}]), (req, res, next) => {
    const name = req.body.name;
    const sheet = req.body.sheet;
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

        let productCsvModel = {
            business: 'business',
            name: 'name',
            unit: 'unit',
            per_unit_value: 'per_unit_value',
            brand: 'brand',
            category: 'category',
            sub_category: 'sub_category',
            sub_category2: 'sub_category2',
            price: 'price',
            is_offer_enable: 'is_offer_enable',
            offer_price: 'offer_price',
            featured_image: 'featured_image',
            short_resolation_image: 'short_resolation_image',
            type: 'type',
            keywords: 'keywords',
            alert_quantity: 'alert_quantity',
            sku: 'sku',
            delivery_time: 'delivery_time',
            status: 'status',
            enable_stock: 'enable_stock',
            current_stock: 'current_stock',
            description: 'description',
            shipping_charge: 'shipping_charge',
            image1: 'image1',
            image2: 'image2',
            image3: 'image3',
            image4: 'image4',
            image5: 'image5',
            image6: 'image6'
        }

        const productObj = Object.keys(products[0]);
        
        console.log(productObj)

        productObj.forEach(key => {
            if(!productCsvModel[key]) {
                throw new Error(key + ',csv')
            }
        })

    
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
                unmatched.push({Product_Name: product.name, Image_Name: 'not found', required_issue: '0', business: '0', unit: '0', brand: '0', category: '0', sub_category: '0', price: '0'})
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

            fs.readFile('./db/db.json')
            .then(data => {
                return JSON.parse(data)
            })
            .then(data => {
                const cloneData = [...data]
    
                for (const item of cloneData) {
                    if(item.name === 'products') {
                        item.data.push({createdAt: new Date().getTime(), path: productFile})
                    }
      
                    if(item.name === 'images_url') {
                        item.data.push({createdAt: new Date().getTime(), path: imageFile})
                    }
                }

                fs.writeFileSync('./db/db.json', JSON.stringify(cloneData))
            })

            fs.readFile('./db/tracker.json')
                .then(data => {
                    return JSON.parse(data)
                })

                .then(data => {
                    const cloneData = data[0].data;

                    for (let index = 0; index < cloneData.length; index++) {
                        const item = cloneData[index];

                        if(item.user_name.toLowerCase() === name.toLowerCase()) {
                            const totalCount = item.data.reduce((accumulator, currentValue) => accumulator + +currentValue.product_count, 0);
                            item.total_count = totalCount + matched.length;
    
                            item.data.push({createdAt: new Date().getTime(), path: `/process-matched/${matchedProcessedFile}`, name: name, sheet: sheet, product_count: matched.length})
                            alreadyFound = true;

                            break;
                        }
                    }

                    const allUser = cloneData.map(item => item.user_name)

                    const foundIndex = allUser.findIndex(item => item.toLowerCase() === name.toLowerCase())

                    if(foundIndex === -1) {
                        cloneData.push({user_name: name, total_count: matched.length, data: [{createdAt: new Date().getTime(), path: `/process-matched/${matchedProcessedFile}`, name: name, sheet: sheet, product_count: matched.length}]})
                    }
                    

                    // for (const item in cloneData) {
                    // }
                    
                    fs.writeFileSync('./db/tracker.json', JSON.stringify([{name: 'products', data: cloneData}]))
                })
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
        if(err.message.split(',')[1] === 'csv') {
            res.send(`
            <main style="font-size: 40px; text-align: center">
                <h2>Something wrong with product csv model, at "${err.message.split(',')[0]}"</h2>
                <div style="margin-bottom: 20px">
                    <a href="/">Back to homepage</a>
                </div>
            </main>
        `);
        } else {
            res.send(`
                <main style="font-size: 40px; text-align: center">
                    <h1>Something went wrong</h1>
                    <p>Main catch block</p>
                    <div style="margin-bottom: 20px">
                        <a href="/">Back to homepage</a>
                    </div>
                </main>
            `);
        }
    })
});

function processProductName(pn) {
    const productName = pn.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    return productName.toLowerCase().trim().replace(/_/g, '-').replace(/–/g, '-').replace(/[$()/|&".,°'*’‘+”=”]/g, '').replace(/-/gi, ' ').replace(/\s+/g, ' ').replace(/ /gi, '-') + '-deshibazaarbd';
};

function processImgUrl(imgUrl) {
    const imageUrl = imgUrl.replace(/'/gi, '').split('---')[0].toLowerCase()
    return imageUrl;
};

app.listen(5050);