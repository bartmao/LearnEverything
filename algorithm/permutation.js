var permutation = function (n) {
    var counter = 0;
    function print_permutation(arr, cur) {
        if (cur == n) {
            console.log(arr.join(','));
            counter++;
            return;
        }
        for (var i = 1; i <= n; ++i) {
            var ok = 1;
            for (var j = 0; j < cur; ++j) {
                if (arr[j] == i) {
                    ok = 0;
                    break;
                }
            }
            if (ok) {
                arr[cur] = i;
                print_permutation(arr, cur + 1);
            }
        }
    }
    print_permutation([], 0);
    return counter;
}

var permutationarr = function (arr) {
    var ans = [];
    var n = arr.length;
    function p(temparr, cur) {
        if (cur == n) {
            ans.push(temparr.slice(0,n));
            return;
        }
        for (var i = 0; i < n; ++i) {
            var ok = 1;
            for (j = 0; j < cur; ++j) {
                if (temparr[j] == arr[i]) {
                    ok = 0;
                    break;
                }
            }
            if (ok) {
                temparr[cur] = arr[i];
                p(temparr, cur + 1);
            }
        }
    }
    p([], 0);

    return ans;
}
console.log(permutationarr([]));
console.log(permutationarr([1]));
console.log(permutationarr([1,2]));
console.log(permutationarr([1,2,3]));
console.log(permutationarr([1,2,3,4]));