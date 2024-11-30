//preview5ZEeQD8I1W8MHLEwlKy7NEmXKjSPJhRZ
import { useEffect, useState } from "preact/hooks";
import { Blockfrost, Constr, Data, fromText, Lucid } from "lucid/mod.ts";
 
import { Input } from "~/components/Input.tsx";
import { Button } from "~/components/Button.tsx";
import { AppliedValidators, applyParams, Validators } from "~/utils.ts";
export interface OneshotProps{
  validators:Validators;
}
export default function Oneshot({validators}:OneshotProps) {
  const [lucid, setLucid] = useState<Lucid | null>(null);// khởi tạo biến state lưu thư viện lucid
  const [blockfrostAPIKey, setBlockfrostAPIKey] = useState<string>("");// khởi tạo state lưu API BlockFrost Key
  const [tokenName, setTokenName] = useState<string>("");  // Tạo 1 biến state lưu token name
  
  const [giftADA, setGiftADA] = useState<string | undefined>();//
  const [lockTxHash, setLockTxHash] = useState<string | undefined>(undefined);// biến này để hiển thị nut lock
  const [waitingLockTx, setWaitingLockTx] = useState<boolean>(false);// biến này để hiển thị load khi chờ xử lỹ lock
  
  const [unlockTxHash, setUnlockTxHash] = useState<string | undefined>(
    undefined
  );// hiển thị button unlock
  const [waitingUnlockTx, setWaitingUnlockTx] = useState<boolean>(false);// hiển thị lock
  const setupLucid = async (e: Event) => {
    e.preventDefault();
 
    const lucid = await Lucid.new(
      new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        `${blockfrostAPIKey}`
      ),
      "Preview"
    );
 
    setLucid(lucid);
  };// khởi tạo lucid
//
// useEffect là một trong những hook quan trọng trong React, 
// được sử dụng để thực hiện các side effects trong các component 
// hàm (functional components). Các side effects có thể bao gồm các 
// hoạt động như gọi API, thay đổi DOM, đăng ký/diễn đàn sự kiện, 
// và nhiều công việc khác liên quan đến "đổi không gian" của ứng dụng.
//Hàm callback bên trong useEffect sẽ được thực thi sau mỗi lần render (khi component được mount hoặc update).// ount là trạng thái hiển thị lần đầu
//Tham số thứ hai của useEffect là một mảng chứa các dependency (phụ thuộc). Nếu bất kỳ giá trị trong mảng này thay đổi giữa các lần render, 
//hàm callback sẽ được thực hiện lại. Nếu không có dependency, hàm callback sẽ chỉ được thực hiện sau lần render đầu tiên.
  useEffect(() => {
    if (lucid) {
      window.cardano.nami.enable().then((wallet) => {
        lucid.selectWallet(wallet);
      });
    }
  }, [lucid]);
 
  const submitTokenName = async (e: Event) => {// submit token name
    e.preventDefault();// ngăn không cho tải lại trang khi gửi dữ liệu
 // khi tải lại trang sẽ phải mất thời gian để load dữ liệu nếu dữ liệu nhiều thì sẽ gây mất tối ưu cho ứng dụng
    const utxos = await lucid?.wallet.getUtxos()!;// lấy các utxos trong wallet
 
    const utxo = utxos[0];// lấy utxo ở đầu list
    const outputReference = {// khởi tạo 1 biến lưu đầu ra tham chiếu của utxo
      txHash: utxo.txHash,
      outputIndex: utxo.outputIndex,
    };
 
    const contracts = applyParams(
      tokenName,// lấy dữ liệu của token name
      outputReference,// lấy dữ liệu của đầu ra tham chiếu giao dịch
      validators,// lấy dữ liệu của hợp đồng
      lucid!// lấy dữ liệu của lucid
    );// khởi tạo 1 contract có chứa các tham số
 
    setParameterizedContracts(contracts);// khởi tạo tham số cho hợp đồng
  };

  const [parameterizedContracts, setParameterizedContracts] =// khởi tạo 1 state kiểu AppliedValidator đã được định nghĩa trước đó 
  useState<AppliedValidators | null>(null);
  
  const createGiftCard = async (e: Event) => {// tạo token
    e.preventDefault();
 
    setWaitingLockTx(true);// biến đổi tạng thái thành đợi lock -> hiển thị hiệu ưng load khi đợi lock tài sản
 
    try {
      const lovelace = Number(giftADA) * 1000000;
 
      const assetName = `${parameterizedContracts!.policyId}${fromText(// contract có policyId
        tokenName
      )}`;// khởi tạo số tiền muốn đúc, tên tài sản bao gồm policyId và token name
 
      // Action::Mint
      // This is how you build the redeemer for gift_card
      // when you want to perform the Mint action.
      const mintRedeemer = Data.to(new Constr(0, []));// chưa hiểu cái này?! giải thích như thế này vì giao dịch mint là giao dịch tiêu hao nên không cần redeem
 // đọc trong phần biên dịch của plutus sẽ thấy rõ
//  "oneshot/Action": {
//   "title": "Action",
//   "anyOf": [
//     {
//       "title": "Mint",
//       "dataType": "constructor",
//       "index": 0,
//       "fields": []
//     },
//     {
//       "title": "Burn",
//       "dataType": "constructor",
//       "index": 1,
//       "fields": []
//     }
//   ]
// },
      const utxos = await lucid?.wallet.getUtxos()!;// lấy utxos của ví
      const utxo = utxos[0];// gán utxo đầu
 
      const tx = await lucid!// soạn giao dịch
        .newTx()
        .collectFrom([utxo])// lấy utxo từ ví
        // use the gift_card validator
        .attachMintingPolicy(parameterizedContracts!.giftCard)// đính kèm dữ liệu
        // mint 1 of the asset
        .mintAssets(// thêm phương thức mint asset
          { [assetName]: BigInt(1) },// chưa hiểu cách viết này lắm
          // this redeemer is the first argument to the gift_card validator
          mintRedeemer// mint này không cần xác thực vì thế mà không cần redeem
        )
        .payToContract(
          parameterizedContracts!.lockAddress,
          {
            // On unlock this gets passed to the redeem
            // validator as datum. Our redeem validator
            // doesn't use it so we can just pass in anything.
            inline: Data.void(),// redeem
          },
          { lovelace: BigInt(lovelace) }
        )
        .complete();
 
      const txSigned = await tx.sign().complete();
 
      const txHash = await txSigned.submit();
 
      const success = await lucid!.awaitTx(txHash);
 
      // Wait a little bit longer so ExhaustedUTxOError doesn't happen
      // in the next Tx
      setTimeout(() => {// xử lý hiển thị hiệu ứng load cho locking
        setWaitingLockTx(false);
 
        if (success) {
          setLockTxHash(txHash);
        }
      }, 3000);
    } catch {
      setWaitingLockTx(false);
    }
  };

  const redeemGiftCard = async (e: Event) => {// xác thực cho unlock tài sản
    e.preventDefault();
 
    setWaitingUnlockTx(true);
 
    try {
      // get the utxos at the redeem validator's address
      const utxos = await lucid!.utxosAt(parameterizedContracts!.lockAddress);// lấy các utxo từ hợp đồng đang khóa của giao dịch mint tài sản// tức là khi mint tài sản thì 1 hợp đống đang giữ tiền và tiền này được biểu thị bằng 1 tài sản
 
      const assetName = `${parameterizedContracts!.policyId}${fromText(
        tokenName
      )}`;// lấy token name
 
      // Action::Burn
      // This is how you build the redeemer for gift_card
      // when you want to perform the Burn action.
      const burnRedeemer = Data.to(new Constr(1, []));// tạo 1 redeem cho việc đốt nhưng chưa hiểu tham số 1 và list của hàm tạo là gì
 // Data.to là 1 hàm để chuyển đổi dữ liệu về dạng data mà hợp đồng thông minh plutus có thể hiểu được
      const tx = await lucid!// soạn giao dịch
        .newTx()
        .collectFrom(
          utxos,
          // This is the second argument to the redeem validator
          // and we also don't do anything with it similar to the
          // inline datum. It's fine to pass in anything in this case.
          Data.void()// 
        )
        // use the gift_card validator again
        .attachMintingPolicy(parameterizedContracts!.giftCard)//đính kèm chính sách mint tài sản nhưng khác mint ở đối số là mount=-1 ở dưới// giftcard là trình xác thực thứ nhất của hợp đồng
        // use the redeem validator
        .attachSpendingValidator(parameterizedContracts!.redeem)// redeem là trình xác thực thứ hai
        .mintAssets(// mint asset với tham số -1 hợp đồng sẽ hiểu là unlock tài sản
          // notice the negative one here
          { [assetName]: BigInt(-1) },
          // this redeemer is the first argument to the gift_card validator
          burnRedeemer// đây là redeem chỉ số action bằng 2 tức là hành động burn 
        )
        .complete();
 
      const txSigned = await tx.sign().complete();
 
      const txHash = await txSigned.submit();
 
      const success = await lucid!.awaitTx(txHash);
 
      setWaitingUnlockTx(false);
 
      if (success) {
        setUnlockTxHash(txHash);
      }
    } catch {
      setWaitingUnlockTx(false);
    }
  };

  return (
    <div>
      {!lucid ? (
        <form class="mt-10 grid grid-cols-1 gap-y-8" onSubmit={setupLucid}>
          <Input
            type="password"
            id="blockfrostAPIKey"
            onInput={(e) => setBlockfrostAPIKey(e.currentTarget.value)}
          >
            Blockfrost API Key
          </Input>
 
          <Button type="submit">Setup Lucid</Button>
        </form>
      ) : (
        <form class="mt-10 grid grid-cols-1 gap-y-8" onSubmit={submitTokenName}>
          <Input
            type="text"
            name="tokenName"
            id="tokenName"
            value={tokenName}
            onInput={(e) => setTokenName(e.currentTarget.value)}
          >
            Token Name
          </Input>
 
          {tokenName && <Button type="submit">Make Contracts</Button>}
        </form>
      )}
      {lucid && parameterizedContracts && (
        <>
          <h3 class="mt-4 mb-2">Redeem</h3>
          <pre class="bg-gray-200 p-2 rounded overflow-x-scroll">
            {parameterizedContracts.redeem.script}
          </pre>
 
          <h3 class="mt-4 mb-2">Gift Card</h3>
          <pre class="bg-gray-200 p-2 rounded overflow-x-scroll">
            {parameterizedContracts.giftCard.script}
          </pre>
        <div class="mt-10 grid grid-cols-1 gap-y-8">
            <Input
              type="text"
              name="giftADA"
              id="giftADA"
              value={giftADA}
              onInput={(e) => setGiftADA(e.currentTarget.value)}
            >
              ADA Amount
            </Input>
 
            <Button
              onClick={createGiftCard}
              disabled={waitingLockTx || !!lockTxHash}
            >
              {waitingLockTx
                ? "Waiting for Tx..."
                : "Create Gift Card (Locks ADA)"}
            </Button>
 
            {lockTxHash && (
              <>
                <h3 class="mt-4 mb-2">ADA Locked</h3>
 
                <a
                  class="mb-2"
                  target="_blank"
                  href={`https://preprod.cardanoscan.io/transaction/${lockTxHash}`}
                >
                  {lockTxHash}
                </a>
                <Button
                  onClick={redeemGiftCard}
                  disabled={waitingLockTx || !!unlockTxHash}
                >
                  {waitingUnlockTx
                    ? "Waiting for Tx..."
                    : "Redeem Gift Card (Unlocks ADA)"}
                </Button>
              </>
            )}
            {unlockTxHash && (
              <>
                <h3 class="mt-4 mb-2">ADA Unlocked</h3>
 
                <a
                  class="mb-2"
                  target="_blank"
                  href={`https://preprod.cardanoscan.io/transaction/${unlockTxHash}`}
                >
                  {unlockTxHash}
                </a>
              </>
            )}
          </div>  
        </>
      )}
    </div>
  );
  }