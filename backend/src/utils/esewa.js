
const crypto = require("crypto");

const generateEsewaSignature = ({
  totalAmount,
  transactionUuid,
  productCode,
}) => {
  const signedFieldNames =
    "total_amount,transaction_uuid,product_code";

  const message =
    `total_amount=${totalAmount},` +
    `transaction_uuid=${transactionUuid},` +
    `product_code=${productCode}`;

  const signature = crypto
    .createHmac("sha256", process.env.ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");

  return {
    signedFieldNames,
    signature,
  };
};

module.exports = {
  generateEsewaSignature,
};
