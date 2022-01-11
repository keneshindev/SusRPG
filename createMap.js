function createMap({ x, y }) {
    const row = [..."a".repeat(x)].map((_, index, array) => {
        if (index == 0 || index == array.length - 1)
            return "wall ";
        else
            return "air ";
    });
    return row.join("").repeat(y).split(" ").filter((notEmpty) => notEmpty);
}
exports.createMap = createMap;
