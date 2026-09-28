import os

def create_tile(p0_bytes, p1_bytes):
    assert len(p0_bytes) == 8 and len(p1_bytes) == 8, "Must provide 8 bytes for each bitplane"
    return bytes(p0_bytes + p1_bytes)

def patch_pinball_rom(
    input_rom='Pinball (Japan, USA).nes',
    smb_rom=r'C:\Users\transmacsual\projects\snes\snes-emulator-master\rom\Super Mario Bros. (World).nes',
    output_rom='Pinball_Mario_Hack.nes'
):
    with open(input_rom, 'rb') as f:
        rom_data = bytearray(f.read())

    # Load authentic Super Mario Bros. (World) CHR data
    with open(smb_rom, 'rb') as f:
        f.seek(16 + 32768)
        smb_chr = f.read(8192)

    def get_smb_tile(idx):
        return smb_chr[idx * 16 : (idx + 1) * 16]

    chr_offset = 16 + 16384

    def patch_tile(tile_index, tile_bytes):
        assert len(tile_bytes) == 16, f"Tile {tile_index} invalid byte length {len(tile_bytes)}"
        offset = chr_offset + tile_index * 16
        rom_data[offset:offset+16] = tile_bytes

    def patch_tile_planes(tile_index, p0, p1):
        patch_tile(tile_index, create_tile(p0, p1))

    # =========================================================================
    # 1. TITLE SCREEN: CLEAN NATIVE "MARIO PINBALL" TEXT
    # Uses 100% native Pinball ROM font characters
    # File offset: 16 + 0x4C9 = 0x4D9 (22 bytes)
    # =========================================================================
    title_text = [
        0xB9, 0xB9, 0xB9, 0xB9,        # 4 spaces
        0x68, 0x60, 0x6C, 0x66, 0x6A,  # M A R I O
        0xB9,                          # 1 space
        0x6B, 0x66, 0x69, 0x61, 0x60, 0x67, 0x67, # P I N B A L L
        0xB9, 0xB9, 0xB9, 0xB9, 0xB9   # 5 spaces
    ]
    assert len(title_text) == 22
    rom_data[16 + 0x4C9 : 16 + 0x4C9 + 22] = bytes(title_text)

    # =========================================================================
    # 2. PRG-ROM PALETTES -> MARIO & GOOMBA/KOOPA COLOR THEMES
    # Palette table is at $E3A2: file offset 16 + 0x23A2 = 0x23B2
    # Table has 4 sprite palettes stored in order: Pal 3, Pal 2, Pal 1, Pal 0
    # =========================================================================
    ptr_offset = 16 + 0x23A2

    # Sprite Palette 0 (Ball & Flippers) at offset + 12:
    # Color 3: 0x16 (Bright Mario / Spiny Red!)
    # Color 2: 0x0F (Jet Black outline!)
    # Color 1: 0x30 (Bright White spikes!)
    rom_data[ptr_offset + 12]     = 0x16  # Color 3 = RED!
    rom_data[ptr_offset + 12 + 1] = 0x0F  # Color 2 = BLACK!
    rom_data[ptr_offset + 12 + 2] = 0x30  # Color 1 = WHITE!

    # Sprite Palette 3 (Mascots / Slot Figures) at offset + 0:
    # Color 3: 0x16 (Bright Red)
    # Color 2: 0x27 (Bright Orange)
    # Color 1: 0x30 (White)
    rom_data[ptr_offset]         = 0x16  # Color 3 = RED!
    rom_data[ptr_offset + 1]     = 0x27  # Color 2 = ORANGE!
    rom_data[ptr_offset + 2]     = 0x30  # Color 1 = WHITE!

    # =========================================================================
    # 3. THE BALL -> AUTHENTIC 10x10 LAKITU SPINY EGG
    # Centered in 16x16 bounding box (Rows 3..7 of TL/TR, Rows 0..4 of BL/BR)
    # Top-Left: Tile 144
    # Top-Right: Tile 145
    # Bottom-Left: Tile 146
    # Bottom-Right: Tile 145 (vertically flipped by NES PPU via attr 0x80)
    # =========================================================================
    t144_p0 = [0x00, 0x00, 0x00, 0x03, 0x07, 0x1F, 0x3F, 0x3F]
    t144_p1 = [0x00, 0x00, 0x00, 0x00, 0x03, 0x07, 0x1F, 0x1F]

    t145_p0 = [0x00, 0x00, 0x00, 0xC0, 0xE0, 0xF8, 0xFC, 0xFC]
    t145_p1 = [0x00, 0x00, 0x00, 0x00, 0xC0, 0xE0, 0xF8, 0xF8]

    t146_p0 = [0x3F, 0x3F, 0x1F, 0x07, 0x03, 0x00, 0x00, 0x00]
    t146_p1 = [0x1F, 0x1F, 0x07, 0x03, 0x00, 0x00, 0x00, 0x00]

    patch_tile_planes(144, t144_p0, t144_p1)
    patch_tile_planes(145, t145_p0, t145_p1)
    patch_tile_planes(146, t146_p0, t146_p1)

    # Ball emerging from plunger animation (Tiles 150, 151, 152)
    # Uses EXACT SMB1 ROM tiles for Lakitu's rolling Spiny Egg!
    patch_tile(150, get_smb_tile(161))
    patch_tile(151, get_smb_tile(163))
    patch_tile(152, get_smb_tile(168))

    # =========================================================================
    # 4. THE "MONKEYS" / PENGUINS -> SMB1 GOOMBAS & KOOPA PARATROOPAS
    # =========================================================================
    # A) Center Figure (Facing Forward) -> 16x16 SMB1 GOOMBA!
    patch_tile(212, get_smb_tile(112)) # Goomba Top-Left
    patch_tile(213, get_smb_tile(113)) # Goomba Top-Right
    patch_tile(214, get_smb_tile(114)) # Goomba Bottom-Left
    patch_tile(215, get_smb_tile(115)) # Goomba Bottom-Right

    # Goomba Walking Animation frames:
    patch_tile(216, get_smb_tile(116))
    patch_tile(217, get_smb_tile(117))
    patch_tile(218, get_smb_tile(118))
    patch_tile(219, get_smb_tile(119))
    patch_tile(220, get_smb_tile(114))
    patch_tile(221, get_smb_tile(115))

    # B) Left & Right Figures (Facing Right / Left) -> 16x16 SMB1 KOOPA PARATROOPA!
    # Original Pinball uses 209 (TL), 208 (TR), 211 (BL), 210 (BR):
    patch_tile(209, get_smb_tile(184)) # Paratroopa Wing Up
    patch_tile(208, get_smb_tile(172)) # Koopa Head
    patch_tile(211, get_smb_tile(187)) # Koopa Shell
    patch_tile(210, get_smb_tile(173)) # Koopa Feet

    # Extra/alternate pose tiles:
    patch_tile(176, get_smb_tile(184)) # Wing Up
    patch_tile(178, get_smb_tile(187)) # Koopa Shell
    patch_tile(177, get_smb_tile(185)) # Wing Down
    patch_tile(179, get_smb_tile(186)) # Koopa Shell
    patch_tile(180, get_smb_tile(184)) # Wing Up
    patch_tile(182, get_smb_tile(187)) # Koopa Shell
    patch_tile(181, get_smb_tile(185)) # Wing Down
    patch_tile(183, get_smb_tile(186)) # Koopa Shell
    patch_tile(184, get_smb_tile(187)) # Koopa Shell

    # C) 3 Standing Center Figures (Scene B Targets):
    patch_tile(175, get_smb_tile(184)) # Wing Up
    patch_tile(92,  get_smb_tile(187)) # Koopa Shell

    # D) Hatched Chicks Walking (All Frames):
    patch_tile(134, get_smb_tile(184)) # Wing Up
    patch_tile(135, get_smb_tile(187)) # Koopa Shell
    patch_tile(153, get_smb_tile(185)) # Wing Down
    patch_tile(154, get_smb_tile(186)) # Koopa Shell

    # Additional chick animation tiles:
    patch_tile(186, get_smb_tile(184))
    patch_tile(187, get_smb_tile(187))
    patch_tile(188, get_smb_tile(186))
    patch_tile(189, get_smb_tile(185))
    patch_tile(190, get_smb_tile(187))
    patch_tile(191, get_smb_tile(186))

    # E) Standing Reel Mascots (8x24):
    patch_tile(125, get_smb_tile(112)) # Goomba Top-Left
    patch_tile(126, get_smb_tile(114)) # Goomba Bottom-Left
    patch_tile(127, get_smb_tile(187)) # Koopa Shell
    patch_tile(136, get_smb_tile(113)) # Goomba Top-Right
    patch_tile(137, get_smb_tile(115)) # Goomba Bottom-Right
    patch_tile(138, get_smb_tile(186)) # Koopa Shell

    # =========================================================================
    # 5. THE TABLE EGGS -> SMB1 KOOPA SHELL (16x16 Composite)
    # Tile 84: Top Left (Top Right is horizontally flipped by PPU)
    # Tile 85: Bottom Left (Bottom Right is horizontally flipped by PPU)
    # =========================================================================
    patch_tile(84, get_smb_tile(187))
    patch_tile(85, get_smb_tile(186))

    with open(output_rom, 'wb') as f:
        f.write(rom_data)

    print(f"ROM Hack written to '{output_rom}' successfully! Total size: {len(rom_data)} bytes.")

if __name__ == '__main__':
    patch_pinball_rom()
