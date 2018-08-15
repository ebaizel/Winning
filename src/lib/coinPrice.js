const ethPriceURL = "https://api.coinmarketcap.com/v1/ticker/ethereum/";

let currentEthPrice;

async function getPrice() {
  if (!!currentEthPrice) {
    return currentEthPrice;
  }

  return fetch(ethPriceURL).then(body => {
    return body.json()
  }).then(prices => {
    currentEthPrice = Number(prices[0].price_usd);
    return currentEthPrice;
  })
}

export default getPrice