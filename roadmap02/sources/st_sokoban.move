module roadmap02::sokoban {
    use sui::url::{Self, Url};
    use std::vector;
    use sui::vec_map;
    use std::string;
    use sui::object::{Self, ID, UID};
    use sui::event;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::display;
    use sui::package;

    /// An example NFT that can be minted by anybody
    struct SokobanLevel has store, copy {
        /// level for the token
        level: u64,
        /// width for the token
        width: u64,
        /// map for the token
        map_data: vector<u8>,
        /// box_pos for the token
        box_pos: vector<u64>,
        /// target_pos for the token
        target_pos: vector<u64>,
        /// start_pos for the token
        start_pos: u64,
        // map creator
        creator: address,
    }

    /// An example NFT that can be minted by anybody
    struct SokobanLevelPack has key, store {
        id: UID,
        /// level for the token
        levels: vector<SokobanLevel>,
        /// name for the level pack
        pack_name: vector<u8>,
        // pack creator
        creator: address,
    }


    /// An example NFT that can be minted by anybody
    struct SokobanBadge has key, store {
        id: UID,
        /// winner for the Badge
        winner: address,
        /// level for the Badge
        level: u64,
        /// URL for the Badge
        url: Url
    }
    /// One-Time-Witness for the module.
    struct SOKOBAN has drop {}

    // ===== Events =====

    struct SokobanBadgeMinted has copy, drop {
        // The Object ID of the Badge
        object_id: ID,
        // The winner of the Badge
        winner: address,
        // The level of the Badge
        level: u64
    }

    struct SokobanLevelMinted has copy, drop {
        /// level for the token
        level: u64,
        /// width for the token
        width: u64,
        /// map for the token
        map_data: vector<u8>,
        /// box_pos for the token
        box_pos: vector<u64>,
        /// target_pos for the token
        target_pos: vector<u64>,
        /// start_pos for the token
        start_pos: u64,
    }

    fun init(otw: SOKOBAN, ctx: &mut TxContext) {

        // Claim the `Publisher` for the package!
        let publisher = package::claim(otw, ctx);


        // set badge
        let badge_keys = vector[
            string::utf8(b"winner"),
            string::utf8(b"level"),
            string::utf8(b"url")
        ];

        let badge_values = vector[
            // winner address
            string::utf8(b"{winner}"),
            // For `level` one can use the `sokoban.level` property
            string::utf8(b"{level}"),
            string::utf8(b"{url}"),
        ];

    
        // Get a new `Display` object for the `SokobanBadge` type.
        let badge_display = display::new_with_fields<SokobanBadge>(
            &publisher, badge_keys, badge_values, ctx
        );

        // Commit first version of `Display` to apply changes.
        display::update_version(&mut badge_display);

        // create sokoban level pack
        let pack = SokobanLevelPack {
            id: object::new(ctx),
            // level for the token
            levels: vector::empty<SokobanLevel>(),
            pack_name: b"levelpack",
            // pack creator
            creator: tx_context::sender(ctx),
        };

        
        transfer::public_transfer(badge_display, tx_context::sender(ctx));
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::share_object(pack);
    }

    // ===== Public view functions =====

    /// Get SokobanLevel `map`
    public fun pack_levels(nft: &SokobanLevelPack): &vector<SokobanLevel> {
        &nft.levels
    }

    /// Get SokobanLevel `map`
    public fun get_level(nft: &SokobanLevelPack, idx: u64): &SokobanLevel {
        vector::borrow<SokobanLevel>(&nft.levels, idx)
    }

    /// Get SokobanLevel `level`
    public fun pack_name(nft: &SokobanLevelPack): &vector<u8> {
        &nft.pack_name
    }

    /// Get SokobanLevel `creator`
    public fun levelpack_creator(nft: &SokobanLevelPack): &address {
        &nft.creator
    }



    /// Get SokobanLevel `map`
    public fun map_data(nft: &SokobanLevel): &vector<u8> {
        &nft.map_data
    }

    /// Get SokobanLevel `level`
    public fun level(nft: &SokobanLevel): &u64 {
        &nft.level
    }

    /// Get SokobanLevel `creator`
    public fun creator(nft: &SokobanLevel): &address {
        &nft.creator
    }



    /// Get SokobanBadge `winner`
    public fun winner(nft: &SokobanBadge): &address {
        &nft.winner
    }

    /// Get SokobanBadge `level`
    public fun badge_level(nft: &SokobanBadge): &u64 {
        &nft.level
    }

    /// Get SokobanBadge `url`
    public fun url(nft: &SokobanBadge): &Url {
        &nft.url
    }


    public entry fun mint_level(
        levelpack: &mut SokobanLevelPack,
        width: u64,
        map_data: vector<u8>,
        box_pos: vector<u64>,
        target_pos: vector<u64>,
        start_pos: u64,
        ctx: & TxContext
    ){
        let sender = tx_context::sender(ctx);
        let level = vector::length<SokobanLevel>(&levelpack.levels);
        let nft = SokobanLevel {
            level: level,
            width: width,
            map_data: map_data,
            box_pos: box_pos,
            target_pos: target_pos,
            start_pos: start_pos,
            creator: sender,
        };

        vector::push_back<SokobanLevel>(&mut levelpack.levels, nft);

        event::emit(SokobanLevelMinted {
            level: level,
            width: width,
            map_data: map_data,
            box_pos: box_pos,
            target_pos: target_pos,
            start_pos: start_pos,
        });

    }

    // ===== Entrypoints =====

    /// Create a new SokobanBadge
    public entry fun mint_to_winner(
        levelpack: & SokobanLevelPack,
        level_index: u64,
        operation: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let passed = vector::borrow<SokobanLevel>(&levelpack.levels, level_index);

        let map = & passed.map_data;
        let box_pos = & passed.box_pos;

        let box_map = vec_map::empty<u64, u64>();
        let i = 0;
        while (i < vector::length(box_pos)) {
            vec_map::insert(&mut box_map, *vector::borrow(box_pos, i), i);
            i = i + 1;
        };

        let target_pos = & passed.target_pos;

        let width = passed.width;
        let current_pos = passed.start_pos;

        let oplen = vector::length(&operation);

        let i =0;

        while (i < oplen){
            let op = *vector::borrow(&operation, i);
            i = i + 1;
            let first_pos = 999999u64;
            let next_pos = 999999u64;

            if (op==2 && current_pos >= width){
                first_pos = current_pos - width;
                if (first_pos >= width){
                    next_pos = first_pos - width;
                }
            }else if (op==8 && current_pos <= width * (width-1)){
                first_pos = current_pos + width;
                if (first_pos <= width * (width-1)){
                    next_pos = first_pos + width;
                }
            }else if (op==4 && current_pos%width > 0){
                first_pos = current_pos - 1;
                if (first_pos%width > 0){
                    next_pos = first_pos - 1;
                }
                
            }else if (op==6 && current_pos%width < width-1){
                first_pos = current_pos + 1;
                if (first_pos%width < width-1){
                    next_pos = first_pos + 1;
                }
            
            } else{
                continue
            };

            let target = vector::borrow(map, first_pos);
            if (*target == 0 && !vec_map::contains(&box_map, &first_pos)){
                current_pos = first_pos;
            }else if (vec_map::contains(&box_map, &first_pos) && next_pos != 999999){
                let next = vector::borrow(map, next_pos);
                if (*next == 0){
                    current_pos = first_pos;
                    vec_map::insert(&mut box_map, next_pos, i);
                    vec_map::remove(&mut box_map, &first_pos);
                }
            }
        };

        let flag = true;

        let i = 0;
        while (i < vector::length(target_pos)){
            if (!vec_map::contains(&box_map, vector::borrow(target_pos, i))){
                flag=false;
                break
            };
            i = i+1;
        };

        if (flag == true){
            let nft = SokobanBadge {
                id: object::new(ctx),
                winner: sender,
                level: passed.level,
                url: url::new_unsafe_from_bytes(b"https://raw.githubusercontent.com/lidashu/learn_sui/main/my-first-sui-dapp/assets/badge.png")
            };

            event::emit(SokobanBadgeMinted {
                object_id: object::id(&nft),
                winner: sender,
                level:passed.level
            });

            transfer::public_transfer(nft, sender);
        }
        
    }

}
