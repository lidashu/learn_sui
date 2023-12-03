module roadmap02::sokoban {
    use sui::url::{Self, Url};
    use std::string;
    use sui::object::{Self, ID, UID};
    use sui::event;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::display;
    use sui::package;

    /// An example NFT that can be minted by anybody
    struct SokobanBadge has key, store {
        id: UID,
        /// Name for the token
        winner: address,
        /// Name for the token
        level: string::String,
        /// Description of the token
        description: string::String,
        /// URL for the token
        url: Url,
        // TODO: allow custom attributes
        creator: address,
    }
    /// One-Time-Witness for the module.
    struct SOKOBAN has drop {}

    // ===== Events =====

    struct SokobanBadgeMinted has copy, drop {
        // The Object ID of the NFT
        object_id: ID,
        // The Object ID of the NFT
        level: string::String,
        // The creator of the NFT
        creator: address,
        // The winner of the NFT
        name: address,
    }

    fun init(otw: SokobanBadge, ctx: &mut TxContext) {
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"level"),
            string::utf8(b"image_url"),
            string::utf8(b"description"),
            string::utf8(b"creator"),
        ];

        let values = vector[
            // For `name` one can use the `sokoban.badge` property
            string::utf8(b"{name}"),
            // For `name` one can use the `sokoban.level` property
            string::utf8(b"{level}"),
            // For `image_url` use an IPFS template + `img_url` property.
            string::utf8(b"{img_url}"),
            // Description is static for all `sokoban` objects.
            string::utf8(b"{description}"),
            // Creator field can be any
            string::utf8(b"{creator}")
        ];

        // Claim the `Publisher` for the package!
        let publisher = package::claim(otw, ctx);

        // Get a new `Display` object for the `Hero` type.
        let display = display::new_with_fields<SokobanBadge>(
            &publisher, keys, values, ctx
        );

        // Commit first version of `Display` to apply changes.
        display::update_version(&mut display);

        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
    }

    // ===== Public view functions =====

    /// Get the NFT's `name`
    public fun name(nft: &SokobanBadge): &string::String {
        &nft.name
    }

    /// Get the NFT's `level`
    public fun level(nft: &SokobanBadge): &string::String {
        &nft.level
    }

    /// Get the NFT's `description`
    public fun description(nft: &SokobanBadge): &string::String {
        &nft.description
    }

    /// Get the NFT's `url`
    public fun url(nft: &SokobanBadge): &Url {
        &nft.url
    }

    // ===== Entrypoints =====

    /// Create a new devnet_nft
    public fun mint_to_winner(
        name: vector<u8>,
        level: vector<u8>,
        description: vector<u8>,
        url: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let nft = SokobanBadge {
            id: object::new(ctx),
            name: string::utf8(name),
            level: string::utf8(level),
            description: string::utf8(description),
            url: url::new_unsafe_from_bytes(url),
            creator: sender,
        };

        event::emit(NFTMinted {
            object_id: object::id(&nft),
            creator: sender,
            name: nft.name,
            level:level
        });

        transfer::public_transfer(nft, sender);
    }

    /// Transfer `nft` to `recipient`
    public entry fun transfer(
        nft: AvatarNFT, recipient: address, _: &mut TxContext
    ) {
        transfer::public_transfer(nft, recipient)
    }

    /// Update the `description` of `nft` to `new_description`
    public entry fun update_description(
        nft: &mut AvatarNFT,
        new_description: vector<u8>,
        _: &mut TxContext
    ) {
        nft.description = string::utf8(new_description)
    }

    /// Permanently delete `nft`
    public entry fun burn(nft: AvatarNFT, _: &mut TxContext) {
        let AvatarNFT { id, name: _, description: _, url: _, creator: _ } = nft;
        object::delete(id)
    }
}
