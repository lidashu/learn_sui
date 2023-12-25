import { useCallback, useEffect, useRef, useState, KeyboardEvent } from "react";
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useCurrentAccount, ConnectModal, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';

import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Flex, Heading } from "@radix-ui/themes";
import { WalletStatus } from "./WalletStatus";

import { LevelpackObjectId, sokobanPackageObjectId, BackupLevels, network, networkUrl } from './constants';

import block_img from "../../assets/block.gif"
import wall_img from "../../assets/wall.png"
import up_img from "../../assets/up.png"
import down_img from "../../assets/down.png"
import left_img from "../../assets/left.png"
import right_img from "../../assets/right.png"
import box_img from "../../assets/box.png"
import target_img from "../../assets/target.png"

const addBackground = {
  backgroundImage: 'url(' + block_img + ')',
}


const client = new SuiClient({
	url: networkUrl,
});

const empty_flag = 0;
const wall_flag = 1;
const box_flag = 3;
const target_flag = 2;
const player_flag = 4;


type ArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

export const Game = () => {
  
  const account = useCurrentAccount();
  const [open, setOpen] = useState(false);

  const [digest, setDigest] = useState(null);
  const [minted, setMinted] = useState(null);

  const { mutate: signAndExecuteTransactionBlock } = useSignAndExecuteTransactionBlock();

  const gameScreenRef = useRef<HTMLDivElement>(null);
  const [playerPos, setPlayer] = useState<number>(-1);
  const [playerDirection, setPlayerDirection] = useState<string>(up_img);
  const [mapWidth, setMapWidth] = useState<number>(-1);
  const [mapData, setMap] = useState<number[]>([]);
  const [playerActions, setPlayerActions] = useState<number[]>([]);
  const [boxPos, setBox] = useState<Set<number>>(new Set([]));
  const [targetPos, setTarget] = useState<Set<number>>(new Set([]));
  const [hasWon, setHasWon] = useState(false);
  
  const [levelContainer, setLevelContainer] = useState<number[][]>([]);
  const [messageWinner, setMessageWinner] = useState("");
  const [levels, setLevels] = useState([]);
  const [level, setLevel] = useState<number>(-1);

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
    if (level < 0){
       loadPackLevels(0);
    }
    if (levels.length == 0){
      if (level==0){
        mint_level();
      }
      
    }else{
      makeLevelMap(level);
      setHasWon(!hasWon);
    }
    
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

  const mint_level_badge = async () => {
    mint_win(playerActions, level);
    
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
        setPlayerDirection(up_img);
        actions.push(2);
        break;
      case "ArrowDown":
        if(playerRow < mapWidth - 1){
          nextPlayer = playerPos + mapWidth;
          if(playerRow < mapWidth - 2){
            nextBox = nextPlayer + mapWidth;
          }
        }
        setPlayerDirection(down_img);
        actions.push(8);
        break;
      case "ArrowLeft":
        if(playerColumn > 0){
          nextPlayer = playerPos - 1;
          if(playerColumn > 1){
            nextBox = nextPlayer - 1;
          }
        }
        setPlayerDirection(left_img)
        actions.push(4);
        break;
      case "ArrowRight":
        if(playerColumn < mapWidth - 1){
          nextPlayer = playerPos + 1;
          if(playerColumn < mapWidth - 2){
            nextBox = nextPlayer + 1;
          }
        }
        setPlayerDirection(right_img)
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

  const loadPackLevels = async (order:number=-1) => {
    let _levelpack = await client.getObject({ id: LevelpackObjectId, options: { showContent: true} });
    let _packlevels = _levelpack.data.content.fields.levels;
    setLevels(_packlevels);
    if (order < 0){
      setLevel(_packlevels.length - 1);
    }else{
      setLevel(0);
    }
    
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const allowedKeys: ArrowKey[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

    if (allowedKeys.includes(event.key as ArrowKey)) {
      handleKeyDown({ key: event.key as ArrowKey });
    }
  };

  const selectLevel = ({ target: { value = "0" } }) => {
    switchLevel(parseInt(value));
    
  };

  const switchLevel = (index:number) => {
    setMessageWinner("");
    setDigest(null);
    setLevel(index);
    
  };

  const nextLevel = () => {
    
    setMessageWinner("");
    setDigest(null);
    setLevel(level + 1);

  };

  const restartLevel = () => {
    setMessageWinner("");
    setDigest(null);
    makeLevelMap(level);
    gameScreenRef.current?.focus();
  };

  const restartGame = () => {
    
    setDigest(null);
    setMessageWinner("");
    setLevel(0);
  };

  const mint_win = useCallback(async (actions:number[], level_index:number) => {
    console.log("try mint_win");
    if (!account) {
      setOpen(true);
      return;
    }
    console.log("got wallet");
    if (actions.length == 0) return;
    try {
      const mintTransactionBlock = new TransactionBlock(); 
      mintTransactionBlock.moveCall({
        target: `${sokobanPackageObjectId}::sokoban::mint_to_winner`,
        arguments: [
          mintTransactionBlock.object(LevelpackObjectId),
          mintTransactionBlock.pure(level_index),
          mintTransactionBlock.pure(actions)
        ]
      })

      console.log("mint_win: ", LevelpackObjectId, level_index, actions);
      await signAndExecuteTransactionBlock({
        transactionBlock: mintTransactionBlock,
          chain: ('sui:' + network) as `string:string`,
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
    if (digestId == null || digestId == "") return;
    let txn_block = await client.getTransactionBlock({ digest: digestId, options: { showEvents: true} });
    console.log("txn_block:", txn_block);
    if (txn_block.events != null && txn_block.events != undefined && txn_block.events.length > 0){
      setMinted(txn_block.events[0].parsedJson["object_id"]);
    }
  }, [digest]);


  const mint_level = async () => {
    let raw_level:number[] = BackupLevels[levels.length];
    let new_level = { 
          width: Math.sqrt(raw_level.length) as number,
          map_data: [] as number[],
          box_pos: [] as number[],
          target_pos: [] as number[],
          start_pos: 0 as number,
    };
    for (let i=0;i<raw_level.length;i++){
      if (raw_level[i] == 1){
        new_level.map_data.push(wall_flag);
      }else{
        new_level.map_data.push(empty_flag);
      }
      if (raw_level[i] == 2){
        new_level.target_pos.push(i);
      }
      if (raw_level[i] == 3){
        new_level.box_pos.push(i);
      }
      if (raw_level[i] == 4){
        new_level.start_pos = i;
      }
      if (raw_level[i] == 5){
        new_level.box_pos.push(i);
        new_level.target_pos.push(i);
      }
      
    }

    console.log("try mint_level");
    if (!account) {
      setOpen(true);
      return;
    }
    
    console.log("got wallet");
    try {
      const mintTransactionBlock = new TransactionBlock(); 
      mintTransactionBlock.moveCall({
        target: `${sokobanPackageObjectId}::sokoban::mint_level`,
        arguments: [
          mintTransactionBlock.object(LevelpackObjectId),
          mintTransactionBlock.pure(new_level.width),
          mintTransactionBlock.pure(new_level.map_data),
          mintTransactionBlock.pure(new_level.box_pos),
          mintTransactionBlock.pure(new_level.target_pos),
          mintTransactionBlock.pure(new_level.start_pos)
        ]
      })
      
      await signAndExecuteTransactionBlock({
        transactionBlock: mintTransactionBlock,
          chain: ('sui:' + network) as `string:string`,
        },
        {
          onSuccess: (result) => {
            console.log('executed transaction block', result);
            loadPackLevels();
          },
        },
      ); 
      
    } catch (error) {
      console.log(error);
    }

  };


  return (
    <>
      <ConnectModal
			trigger={<h1 />}
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
		/>
      {messageWinner && (
        <div className="message-winner">
          <div>
            <h3>{messageWinner}</h3>
            {
              digest == null ? (
              <button className="btn" onClick={mint_level_badge}>
                  mint this level badge
              </button>
              ) :(<div><a href={"https://suiexplorer.com/object/" + minted +"?network=" + network} target="_blank" >Badge</a> Minted!</div>)
            }
            
            {level < levels.length - 1 ? (
              <div>
                <button className="btn" onClick={nextLevel}>
                  Next Level
                </button>
              </div>
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
      <h1 className="title">Sokoban </h1>
      
      <Flex position="sticky" justify="between" className="background">
      <Heading className="pb-2 between flex">
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
        { levels.length < BackupLevels.length ? 
                  <button className="btn" onClick={mint_level}>
                    mint new level
                  </button>
              :<></>
            }
        </Heading>
        <Flex justify="between">
        <Heading><WalletStatus /></Heading>
        <Box position="sticky"><ConnectButton /></Box>

        </Flex>
      </Flex>
      

      <div className="game" ref={gameScreenRef} tabIndex={-1} onKeyDown={onKeyDown}>
        {levelContainer.map((row, rowIndex) => (
          <div className="flex" key={rowIndex}>
            {row.map((cell, cellIndex) => {
              if (cell === 0) return <img style={addBackground} src={block_img} className="cell cell-img" key={cellIndex} />;
              else if (cell === 1) return <img style={addBackground} src={wall_img} className="cell cell-img" key={cellIndex} />;
              else if (cell === box_flag) return <img style={addBackground} src={box_img} className="cell cell-img" key={cellIndex} />;
              else if (cell === target_flag) return <img style={addBackground} src={target_img} className="cell cell-img" key={cellIndex} />;
              else if (cell === player_flag) return <img style={addBackground} src={playerDirection} className={`cell cell-player`} key={cellIndex} />;
            })}
          </div>
        ))}
      </div>
      
    </>
  );
};
