function AnotherFactory() { // ★ここにジャンプさせたい
    return {
        getData: function() {
            return 'Data from AnotherFactory (from separate file)';
        }
    };
}