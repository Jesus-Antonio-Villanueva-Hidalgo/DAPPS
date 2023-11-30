require('dotenv').config();
const fs = require('fs')
const FormData = require('form-data');
const axios = require("axios")
const { ethers } = require("ethers")

const contract = require("../artifacts/contracts/NFTContract.sol/ArGram.json");
const {
    PINATA_API_KEY,
    PINATA_SECRET_KEY,
    API_URL,
    PRIVATE_KEY,
    PUBLIC_KEY,
    CONTRACT_ADDRESS
} = process.env;


var stringFileIPFS = "";
var stringTokenURI = "";

async function createImgInfo(routeImage) {
    // const authResponse = await axios.get("https://api.pinata.cloud/data/testAuthentication", {
    //     headers: {
    //         pinata_api_key: PINATA_API_KEY,
    //         pinata_secret_api_key: PINATA_SECRET_KEY,
    //     },
    // });
    // console.log(authResponse)
    const stream = fs.createReadStream(`./images/${routeImage}`)
    const data = new FormData()
    data.append("file", stream)
    const fileResponse = await
        axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            data,
            {
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_KEY
                }
            })
    const { data: fileData = {} } = fileResponse;
    const { IpfsHash } = fileData;
    const fileIPFS = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
    console.log("fileIPFS: "+fileIPFS)
    return fileIPFS;
}
//createImgInfo()
async function createJsonInfo(name, description) {
    const metadata = {
        image: stringFileIPFS,
        name: name,
        description: description,
        attributes: [
            { "trait_type": "color", "value": "brown" },
            { "trait_type": "background", "value": "white" },
        ]
    }
    const pinataJSONBody = {
        pinataContent: metadata
    }
    const jsonResponse = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        pinataJSONBody,
        {
            headers: {
                "Content-Type": "application/json",
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_KEY
            }
        }
    )
    const { data: jsonData = {} } = jsonResponse;
    const { IpfsHash } = jsonData;
    const tokenURI = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
    console.log("Token URI: "+tokenURI)
    return tokenURI;
}

async function mintNFT() {
    const provider = new ethers.providers.JsonRpcProvider(API_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const etherInterface = new ethers.utils.Interface(contract.abi);
    const nonce = await provider.getTransactionCount(PUBLIC_KEY, "latest")
    const gasPrice = await provider.getGasPrice();
    const network = await provider.getNetwork();
    const { chainId } = network;
    const transaction = {
        from: PUBLIC_KEY,
        to: CONTRACT_ADDRESS,
        nonce,
        chainId,
        gasPrice,
        data: etherInterface.encodeFunctionData("mintNFT",
            [PUBLIC_KEY, stringTokenURI])
    }
    const estimateGas = await provider.estimateGas(transaction)
    transaction["gasLimit"] = estimateGas;
    const singedTx = await wallet.signTransaction(transaction)
    const transactionReceipt = await provider.sendTransaction(singedTx);
    await transactionReceipt.wait()
    const hash = transactionReceipt.hash;
    console.log("Your Transaction hash is:", hash)

    const receipt = await provider.getTransactionReceipt(hash);
    const { logs } = receipt;
    const tokenInBigNumber = ethers.BigNumber.from(logs[0].topics[3]);
    const tokenId = tokenInBigNumber.toNumber();
    console.log("NFT token id", tokenId)
}
//mintNFT();

async function execute(){
    const names = ["Protoboard","Arreglo","Pancho taco","Rafa","Password",
    "Coca de piña","Luna","Simposium 2019","Independencia 2019"];
    const descriptions = ["Contador de la materia de sistemas programables",
    "El centro de mesa del evento de clausura del simposium 2019",
    "Pancho comiéndose un taco después de salir de un examen del Ing. Takeyas",
    "Rafa esperando su malteada",
    "Usuario y contraseña para ingresar al internet de Sistemas",
    "Coca de piña encontrada en los alrededores del tec",
    "Fotografía de la luna tomada a traves de un telescopio",
    "Recuerdo del simposium en la cueva leonistica",
    "Fiesta por día de la independencia 2019"];
    var stringFiles = fs.readdirSync("./images");
    var index = 8;
    stringFileIPFS = await createImgInfo(stringFiles[index]);
    stringTokenURI = await createJsonInfo(names[index],descriptions[index]);
    await mintNFT();
}
execute();