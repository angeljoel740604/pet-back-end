const dateFormat = require('dateformat');

module.exports.formatAddress = (address) => {
    if (address === null || address === undefined) {
        return '';
    }
    return {
        street: address.Street.replace('\r\n', ' '),
        city: address.City,
        state: address.State,
        zipCode: address.ZipCode,
        country: address.Country && address.Country.Code,
    };
};

module.exports.formatAddressUpper = (address) => {
    if (address === null || address === undefined || address === '') {
        return '';
    }
    return {
        Street: address.Street.replace('\r\n', ' '),
        City: address.City,
        State: address.State,
        ZipCode: address.ZipCode,
        // Country: address.Country && address.Country.Code,
    };
};

module.exports.accountDefinitionType = (type) => {
    const typeArr = [
        'AccountsPayable',
        'AccountsReceivable',
        'BankAccount',
        'CostOfGoodSold',
        'CreditCard',
        'Equity',
        'Expense',
        'FixedAssets',
        'Income',
        'LongTermLiability',
        'OtherAssets',
        'OtherCurrentAssets',
        'OtherCurrentLiability',
        'UndepositFunds',
    ];

    return typeArr[type];
};

module.exports.chargesDefinitionType = (type) => {
    const typeArr = ['Freight', 'Inventory', 'Other', 'OtherFreight', 'Tax', 'Valuation'];

    return typeArr[type];
};

module.exports.convertDatetoUTC = (date) => {
    const originalDate = new Date(date);
    const year = originalDate.getUTCFullYear();
    const month = originalDate.getUTCMonth();
    const day = originalDate.getUTCDate();
    const hour = originalDate.getUTCHours();

    const dateTest = new Date(year, month, day, hour);
    const invoiceDate = dateFormat(dateTest, 'isoUtcDateTime', true);

    return invoiceDate;
};

module.exports.dateStringUs = (originalDate) => {
    const result = {
        date:
            (originalDate > 0 && dateFormat(new Date(originalDate).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
            undefined,
        time:
            (originalDate > 0 && dateFormat(new Date(originalDate).toLocaleString('en-US'), 'HH:MM')) ||
            undefined,
    };

    return result;
};

module.exports.dateIsValid = (date) => {
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|1\d|2\d|3[01])\/(19|20)\d{2}$/;
    if (!dateRegex.test(date)) {
        return false;
    }
    return true;
};

module.exports.getPackageTypeCode = (packType) => {
    const arr = [
        { code: 'AMM', value: 'Ammo Pack' },
        { code: 'BAG', value: 'Bag' },
        { code: 'BAL', value: 'Bale' },
        { code: 'BBL', value: 'Barrel' },
        { code: 'BDL', value: 'Bundle' },
        { code: 'BEM', value: 'Beam' },
        { code: 'BIC', value: 'Bing Chest' },
        { code: 'BIN', value: 'Bin' },
        { code: 'BKG', value: 'Bulk Bag' },
        { code: 'BKT', value: 'Bucket' },
        { code: 'BLE', value: 'Bale' },
        { code: 'BLK', value: 'Bulk' },
        { code: 'BOB', value: 'Bobbin' },
        { code: 'BOT', value: 'Bottle' },
        { code: 'BOX', value: 'Box' },
        { code: 'BRG', value: 'Barge' },
        { code: 'BSK', value: 'Basket' },
        { code: 'BXI', value: 'Box with inner container' },
        { code: 'BXT', value: 'Bucket' },
        { code: 'CAB', value: 'Cabinet' },
        { code: 'CAG', value: 'Cage' },
        { code: 'CAN', value: 'Can' },
        { code: 'CAR', value: 'Carcass' },
        { code: 'CAS', value: 'Case' },
        { code: 'CBC', value: 'Container Bulk Cargo' },
        { code: 'CBY', value: 'Carboy' },
        { code: 'CCS', value: 'Can Case' },
        { code: 'CHE', value: 'Cheeses' },
        { code: 'CHS', value: 'Chest' },
        { code: 'CLD', value: 'Car Load, Rail' },
        { code: 'CNA', value: 'Household goods, Containers, wood' },
        {
            code: 'CNB',
            value: 'Container MSC ISO Military Airlift Container Internationals Standards Organization, Light weight 8x8x20 foot air',
        },
        { code: 'CNC', value: 'Container, Navy Cargo Transporter' },
        { code: 'CND', value: 'Container, Commercial Highway lift' },
        { code: 'CNE', value: 'Engine Container' },
        { code: 'CNF', value: 'Multiwall Container Secured to Warehouse Pallet' },
        { code: 'CNT', value: 'Container' },
        { code: 'CNX', value: 'CONEX Container Express' },
        { code: 'COL', value: 'Coil' },
        { code: 'CON', value: 'Cones' },
        { code: 'COR', value: 'Cord' },
        { code: 'CRD', value: 'Cradle' },
        { code: 'CRT', value: 'Crate' },
        { code: 'CSK', value: 'Cask' },
        { code: 'CTN', value: 'Carton' },
        { code: 'CUB', value: 'Cube' },
        { code: 'CYL', value: 'Cylinder' },
        { code: 'DBK', value: 'Dry Bulk' },
        { code: 'DRK', value: 'Double Length Rack' },
        { code: 'DRM', value: 'Drum' },
        { code: 'DSK', value: 'Double Length Skid' },
        { code: 'DTB', value: 'Double Length Toe Bin' },
        { code: 'DUF', value: 'Duffel Bag' },
        { code: 'ENV', value: 'Envelope' },
        { code: 'FIR', value: 'Firkin' },
        { code: 'FLO', value: 'Flo bin' },
        { code: 'FLX', value: 'Liner Bag Liquid' },
        { code: 'FRM', value: 'Frame' },
        { code: 'FSK', value: 'Flask' },
        { code: 'FWR', value: 'Forward' },
        { code: 'GAL', value: 'Gallon' },
        { code: 'GOH', value: 'Garments on Hangers' },
        { code: 'HED', value: 'Heads of Beef' },
        { code: 'HGH', value: 'Hogshead' },
        { code: 'HMP', value: 'Hamper' },
        { code: 'HPT', value: 'Hopper Truck' },
        { code: 'HRB', value: 'On Hanger or Rack in Boxes' },
        { code: 'HRK', value: 'Half Standard Rack' },
        { code: 'HTB', value: 'Half Standard Tote Bin' },
        { code: 'JAR', value: 'Jar' },
        { code: 'JUG', value: 'Jug' },
        { code: 'KEG', value: 'Keg' },
        { code: 'KIT', value: 'Kit' },
        { code: 'KRK', value: 'Knockdown Rack' },
        { code: 'KTB', value: 'Knockdown Tote Bin' },
        { code: 'LBK', value: 'Liquid Bulk' },
        { code: 'LIF', value: 'Lifts' },
        { code: 'LOG', value: 'Logs' },
        { code: 'LSE', value: 'Loose' },
        { code: 'LUG', value: 'Lugs' },
        { code: 'LVN', value: 'Lift Van' },
        { code: 'MLV', value: 'MILVAN Military Van' },
        { code: 'MRP', value: 'Multi Roll Pack' },
        { code: 'MSV', value: 'MSCVAN Military Sealift Command Van' },
        { code: 'MXD', value: 'Mixed Type Pack' },
        { code: 'NOL', value: 'Noil' },
        { code: 'OVW', value: 'Overwrap' },
        { code: 'PAL', value: 'Pail' },
        { code: 'PCK', value: 'Packed not otherwise specified' },
        { code: 'PCL', value: 'Parcel' },
        { code: 'PCS', value: 'Pieces' },
        { code: 'PIR', value: 'Pims' },
        { code: 'PKG', value: 'Package' },
        { code: 'PLF', value: 'Platform' },
        { code: 'PLN', value: 'Pipeline' },
        { code: 'PLT', value: 'Pallet (Not used in Sea AMS)' },
        { code: 'POV', value: 'Private Vehicle' },
        { code: 'PRK', value: 'Pipe Rack' },
        { code: 'QTR', value: 'Quarters of Beef' },
        { code: 'RAL', value: 'Rail (Semiconductor)' },
        { code: 'RCK', value: 'Rack' },
        { code: 'REL', value: 'Reel' },
        { code: 'ROL', value: 'Roll' },
        { code: 'RVR', value: 'Reverse Reel' },
        { code: 'SAK', value: 'Sack' },
        { code: 'SBC', value: 'Liner Bag Dry' },
        { code: 'SCS', value: 'Suitcase' },
        { code: 'SHK', value: 'Shook' },
        { code: 'SHT', value: 'Sheet' },
        { code: 'SID', value: 'Sides of Beef' },
        { code: 'SKD', value: 'Skid' },
        { code: 'SKE', value: 'Skid elevating or lift truck' },
        { code: 'SLP', value: 'Slip Sheet' },
        { code: 'SLV', value: 'Sleeve' },
        { code: 'SPI', value: 'Sin Cylinders' },
        { code: 'SPL', value: 'Spool' },
        { code: 'SVN', value: 'SEAVAN Sea Van' },
        { code: 'TBE', value: 'Tube' },
        { code: 'TBN', value: 'Tote Bin' },
        { code: 'TKR', value: 'Tank Car' },
        { code: 'TIN', value: 'Tin' },
        { code: 'TKT', value: 'Tank Truck' },
        { code: 'TLD', value: 'Intermodal Trainler/Container Load (Rail)' },
        { code: 'TNK', value: 'Tank' },
        { code: 'TRC', value: 'Tierce' },
        { code: 'TRI', value: 'Triwall Box' },
        { code: 'TRK', value: 'Trunk or Chest' },
        { code: 'TRY', value: 'Tray' },
        { code: 'TSS', value: 'Trunk, Salesmen Sample' },
        { code: 'TTC', value: 'Tote Can' },
        { code: 'TUB', value: 'Tub' },
        { code: 'UNP', value: 'Unpacked' },
        { code: 'UNT', value: 'Unit' },
        { code: 'VEH', value: 'Vehicles' },
        { code: 'VPK', value: 'Van Pack' },
        { code: 'WDC', value: 'Wooden Case' },
        { code: 'WHE', value: 'On Own Wheels' },
        { code: 'WLC', value: 'Wheeled Carrier' },
        { code: 'WRP', value: 'Wrapped' },
    ];

    let result = arr.find((p) => p.value === packType);
    result = result !== undefined ? result.code : 'PCS';
    return result;
};
