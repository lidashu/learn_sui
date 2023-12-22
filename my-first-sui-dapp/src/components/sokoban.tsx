import { useCallback, useEffect, useRef, useState, KeyboardEvent } from "react";
import { SuiClient, SuiEvent } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';


const client = new SuiClient({
	url: 'https://fullnode.testnet.sui.io:443',
});


const wall_flag = 1;
const box_flag = 3;
const target_flag = 2;
const player_flag = 4;

const LevelpackObjectId = '0x6a6644c8360f296c9049488312a590a184f743205ddfa76eeafa709c354f63ae'; 
const sokobanPackageObjectId = '0xdff37ddba67d72f63afca72cb3f39bd272b9b79c440c532c77419893f9f641d2'; 

const levelpack = await client.getObject({ id: LevelpackObjectId, options: { showContent: true} });
const levels = levelpack.data.content.fields.levels;

type ArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

export const Game = () => {
  
  const account = useCurrentAccount();
  const [digest, setDigest] = useState(null);
  const [minted, setMinted] = useState(null);

  const { mutate: signAndExecuteTransactionBlock } = useSignAndExecuteTransactionBlock();

  const gameScreenRef = useRef<HTMLDivElement>(null);
  const [playerPos, setPlayer] = useState<number>(-1);
  const [mapWidth, setMapWidth] = useState<number>(-1);
  const [mapData, setMap] = useState<number[]>([]);
  const [playerActions, setPlayerActions] = useState<number[]>([]);
  const [boxPos, setBox] = useState<Set<number>>(new Set([]));
  const [targetPos, setTarget] = useState<Set<number>>(new Set([]));
  const [hasWon, setHasWon] = useState(false);
  const [imgDirection, setImgDirection] = useState("cell-player-ArrowUp");
  
  const [levelContainer, setLevelContainer] = useState<number[][]>([]);
  const [messageWinner, setMessageWinner] = useState("");
  const [level, setLevel] = useState<number>(0);

  const makeLevelMap = (levelIndex: number) => {

      setPlayerActions([]);

      let width:number = Number(levels[levelIndex].fields.width);
      setMapWidth(width);

      let map_data:number[] = levels[levelIndex].fields.map_data.map(Number);
      setMap(map_data);

      let box_pos:number[] = levels[levelIndex].fields.box_pos.map(Number);
      let target_pos:number[] = levels[levelIndex].fields.target_pos.map(Number);
      let start_pos:number = Number(levels[levelIndex].fields.start_pos);

      setBox(new Set<number>(box_pos));
      setTarget(new Set<number>(target_pos));
      setPlayer(start_pos);

  };

  const updateLevelMap = () => {
    
    let levelMap:number[][] = [];
    for (let i=0;i<mapWidth;i++){
      levelMap.push([]);
    }
    mapData.forEach((v,i) => {
      levelMap[Math.floor(i/mapWidth)].push(v);
    });

    targetPos.forEach((x:number) => { levelMap[Math.floor(x/mapWidth)][x%mapWidth] = target_flag; });
    boxPos.forEach((x:number) => { levelMap[Math.floor(x/mapWidth)][x%mapWidth] = box_flag; });
    levelMap[Math.floor(playerPos/mapWidth)][playerPos%mapWidth] = player_flag;
    
    setLevelContainer(levelMap);
  };

  useEffect(() => {
    makeLevelMap(level);
    setHasWon(!hasWon);
  }, [level]);

  useEffect(() => {
    if (playerPos >= 0){
      updateLevelMap();
      const win = checkStatus(boxPos, targetPos);
      if (win) {
        setMessageWinner(`You won level ${level + 1}!`);
        gameScreenRef.current?.blur();
        setHasWon(win);
      }
    }
    
  }, [playerPos]);

  useEffect(() => {
    gameScreenRef.current?.focus();
  }, [hasWon]);


  useEffect(() => {
    if (digest==null) return;
    fetch_minted(digest);
  }, [digest]);

  const mint_won_level = async () => {
    mint_win(playerActions);
    
  };

  const checkStatus = ( s1: Set<number>, s2: Set<number>) => {

    if (s1.size == 0 || s2.size == 0) {
      return false;
    }
    
    if (s1.size != s2.size) {
      return false;
    }
    
    return Array.from(s1).every(element => {
      return s2.has(element);
    });

  };

  const handleKeyDown = ({ key }: { key: ArrowKey }): void => {
    // Set the direction of the player
    const keyPressed = {
      ArrowUp: "cell-player-ArrowUp",
      ArrowDown: "cell-player-ArrowDown",
      ArrowLeft: "cell-player-ArrowLeft",
      ArrowRight: "cell-player-ArrowRight",
    };
    setImgDirection(keyPressed[key]);
    let nextPlayer:number = -1;
    let nextBox:number = -1;

    let playerRow = Math.floor(playerPos/mapWidth);
    let playerColumn = playerPos%mapWidth;

    let actions:number[] = playerActions.map(Number);

    switch (key) {
      case "ArrowUp":
        if(playerRow > 0){
          nextPlayer = playerPos - mapWidth;
          if(playerRow > 1){
            nextBox = nextPlayer - mapWidth;
          }
        }
        actions.push(2);
        break;
      case "ArrowDown":
        if(playerRow < mapWidth - 1){
          nextPlayer = playerPos + mapWidth;
          if(playerRow < mapWidth - 2){
            nextBox = nextPlayer + mapWidth;
          }
        }
        actions.push(8);
        break;
      case "ArrowLeft":
        if(playerColumn > 0){
          nextPlayer = playerPos - 1;
          if(playerColumn > 1){
            nextBox = nextPlayer - 1;
          }
        }
        actions.push(4);
        break;
      case "ArrowRight":
        if(playerColumn < mapWidth - 1){
          nextPlayer = playerPos + 1;
          if(playerColumn < mapWidth - 2){
            nextBox = nextPlayer + 1;
          }
        }
        actions.push(6);
        break;
      default:
        break;
    }

    setPlayerActions(actions);

    if (nextPlayer >=0 && mapData[nextPlayer] != wall_flag){
      if (!boxPos.has(nextPlayer)){
        setPlayer(nextPlayer);
      }else if (nextBox >=0 && mapData[nextBox] != wall_flag && !boxPos.has(nextBox)){
        let new_box = new Set<number>(Array.from(boxPos));
        new_box.delete(nextPlayer);
        new_box.add(nextBox);
        setBox(new_box);
        setPlayer(nextPlayer);
      }
      
    }

  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const allowedKeys: ArrowKey[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

    if (allowedKeys.includes(event.key as ArrowKey)) {
      handleKeyDown({ key: event.key as ArrowKey });
    }
  };

  const selectLevel = ({ target: { value = "0" } }) => {
    setLevel(parseInt(value));
    setMessageWinner("");
  };

  const nextLevel = () => {
    setLevel(level + 1);
    setMessageWinner("");
    setDigest(null);
  };

  const restartLevel = () => {
    setMessageWinner("");
    setDigest(null);
    makeLevelMap(level);
    gameScreenRef.current?.focus();
  };

  const restartGame = () => {
    setLevel(0);
    setDigest(null);
    setMessageWinner("");
    makeLevelMap(0);
  };

  const mint_win = useCallback(async (actions:number[]) => {
    console.log("try mint_win");
    if (!account) return;
    console.log("got wallet");
    if (actions.length == 0) return;
    try {
      const mintTransactionBlock = new TransactionBlock(); 
      mintTransactionBlock.moveCall({
        target: `${sokobanPackageObjectId}::sokoban::mint_to_winner`,
        arguments: [
          mintTransactionBlock.object(LevelpackObjectId),
          mintTransactionBlock.pure(level),
          mintTransactionBlock.pure(actions)
        ]
      })
      
      await signAndExecuteTransactionBlock({
        transactionBlock: mintTransactionBlock,
          chain: 'sui:testnet',
        },
        {
          onSuccess: (result) => {
            console.log('executed transaction block', result);
            setDigest(result.digest);
          },
        },
      ); 
      
    } catch (error) {
      console.log(error);
    }
  }, [account]);

  const fetch_minted = useCallback(async (digestId:string) => {
    let txn_block = await client.getTransactionBlock({ digest: digestId, options: { showEvents: true} });
    console.log("txn_block:", txn_block);
    if (txn_block.events != null && txn_block.events != undefined && txn_block.events.length > 0){
      setMinted(txn_block.events[0].parsedJson["object_id"]);
    }
  }, [digest]);


  return (
    <>
      {messageWinner && (
        <div className="message-winner">
          <div>
            <h3>{messageWinner}</h3>
            {
              digest == null ? (
              <button className="btn" onClick={mint_won_level}>
                  mint this level
              </button>
              ) :(<div><a href={"https://suiexplorer.com/object/" + minted +"?network=testnet"} >Badge</a> Minted!</div>)}
            
            {level < levels.length - 1 ? (
              <button className="btn" onClick={nextLevel}>
                Next Level
              </button>
            ) : (
              <>
                <h4>& The full game!</h4>
                <button className="btn" onClick={restartGame}>
                  Restart Game
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <h1 className="title">Sokoban</h1>
      <div className="pb-2 between flex">
        <select className="btn" value={level} onChange={selectLevel}>
          {levels.map((l = "", index = 0) => (
            <option key={index} value={index}>
              Level {index + 1}
            </option>
          ))}
        </select>
        <button className="btn" onClick={restartLevel}>
          Restart Level
        </button>
      </div>

      <div className="game" ref={gameScreenRef} tabIndex={-1} onKeyDown={onKeyDown}>
        {levelContainer.map((row, rowIndex) => (
          <div className="flex" key={rowIndex}>
            {row.map((cell, cellIndex) => {
              if (cell === 0) return <div className="cell cell-empty cell-img" key={cellIndex} />;
              else if (cell === 1) return <div className="cell cell-wall cell-img" key={cellIndex} />;
              else if (cell === box_flag) return <div className="cell cell-box cell-img" key={cellIndex} />;
              else if (cell === target_flag) return <div className="cell cell-goal cell-img" key={cellIndex} />;
              else if (cell === player_flag) return <div className={`cell cell-img cell-player ${imgDirection}`} key={cellIndex} />;
            })}
          </div>
        ))}
      </div>
      
    </>
  );
};
