import { 
  applyDoubleCborEncoding,// hàm này chuyển từ dạng script sang DoubleEncoding
  applyParamsToScript,// hàm này chuyển tham số thành mô tả cho hợp đồng
  Constr,// hàm khởi tạo ... gì đó
  fromText,// chuyển text
  Lucid,// thư viện lucid
  MintingPolicy, // mục tiêu của giao dịch
  OutRef,// đầu ra tham chiếu của giao dịch
  SpendingValidator// xác thực mục đích sử dụng của hợp đồng thông minh
 } from "lucid/mod.ts";
 
import blueprint from "~/plutus.json" assert { type: "json" };
 
export type Validators = {
  redeem: SpendingValidator;// xác thực sử dụng tài sản
  giftCard: MintingPolicy;// xác thực mint
};
// khởi tạo kiểu và cho phép nó được sử dụng
export function readValidators(): Validators {// export 1 hàm kiểu Validators
  const redeem = blueprint.validators.find((v) => v.title === "oneshot.redeem");// tìm kiếm trình xác thực redeem
 
  if (!redeem) {
    throw new Error("Redeem validator not found");
  }
 
  const giftCard = blueprint.validators.find(// tìm kiếm trình xác thực giftcard
    (v) => v.title === "oneshot.gift_card"
  );
 
  if (!giftCard) {
    throw new Error("Gift Card validator not found");
  }
 
  return {
    redeem: {
      type: "PlutusV2",
      script: redeem.compiledCode,
    },
    giftCard: {
      type: "PlutusV2",
      script: giftCard.compiledCode,
    },
  };
  
}
// tạo ra 1 kiểu trả về một số tham số của hợp đồng thông minh
export type AppliedValidators = {
  redeem: SpendingValidator;
  giftCard: MintingPolicy;
  policyId: string;
  lockAddress: string;
};
// định nghĩa 1 type
// định nghĩa 1 hàm trả về các tham số liên quan đến hợp đồng thông minh
export function applyParams(
  tokenName: string,// tên tài sản
  outputReference: OutRef,// đầu ra của giao dịch
  validators: Validators,// hợp đồng
  lucid: Lucid// thư viện lucid
): AppliedValidators {// áp dụng các tham số của script của giftcard và redeem để tạo ra thông tin chi tiết về hợp đồng thông minh
  const outRef = new Constr(0, [
    new Constr(0, [outputReference.txHash]),
    BigInt(outputReference.outputIndex),
  ]);// khởi tạo đầu ra tham chiếu tài sản
 
  const giftCard = applyParamsToScript(validators.giftCard.script, [// giải thích: áp dụng các tham số để chuyển thành mô tả  chi tiết về tài sản
    fromText(tokenName),
    outRef,
  ]);// biến này mô tả giftcard bao gồm thông tin mô tả về hợp đồng mint, token name, mô tả đầu ra
 
  const policyId = lucid.utils.validatorToScriptHash({
    type: "PlutusV2",
    script: giftCard,
  });// biến policyId của giftcard sau 1 lần sử dụng
 
  const redeem = applyParamsToScript(validators.redeem.script, [// áp dụng các tham số để mô tả redeeme đốt
    fromText(tokenName),// redeem ở đây là 1 thông điệp giống như một mật khẩu để đối chiếu xác thực
    policyId,
  ]);// biến mô tả redeem đốt tài sản bao gồm có mô tả hợp đồng, tên tài sản, policyId
 
  const lockAddress = lucid.utils.validatorToAddress({
    type: "PlutusV2",
    script: redeem,
  });// biến lưu lại mô tả của hợp đồng thông minh
 
  return {// hàm trả về các đối tượng trong đó redeem là một đối tượng kiểu plutus v2 được mô tả bằng redeem
    redeem: { type: "PlutusV2", script: applyDoubleCborEncoding(redeem) },// trình xác thực redeem đây là của hàm xác thực redeem nàm trong trình xác thực
    giftCard: { type: "PlutusV2", script: applyDoubleCborEncoding(giftCard) },// trình xác thực gifcard
    policyId,// trả về policyId của tài sản
    lockAddress,//lưu lại địa chỉ hợp đồng đang lock
  };
}
// tóm lại file này có một vài mục đích đó là tạo ra các kiểu để sử dụng cho việc tương tác hợp đồng thông minh kiểu thứ nhất là Validator 
// kiểu thứ hai là ApplyValidator đây là một kiểu để có thể sử dụng các tham số của hợp đồng bao gồm redeem để xác thực, policyId, tài sản, địa chỉ của hợp đồng