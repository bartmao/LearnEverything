function buildupHeap(arr, len) {
    if (len <= 1) return;
    var lastParent = Math.floor(len / 2) - 1;
    while (lastParent >= 0) {
        maxHeapify(arr, len, lastParent);
        lastParent--;
    }
}

function maxHeapify(arr, len, root) {
    if (root >= len - 1) return;

    var largest = root;
    var left = 2 * root + 1;
    var right = 2 * root + 2;
    if (left < len && arr[largest] < arr[left]) {
        largest = left;
    }
    if (right < len && arr[largest] < arr[right]) {
        largest = right;
    }

    if (largest != root) {
        var t = arr[root];
        arr[root] = arr[largest];
        arr[largest] = t;
        maxHeapify(arr, len, largest);
    }
}

function heapSort(arr) {
    buildupHeap(arr, arr.length);
    for (var i = arr.length - 1; i > 0; i--) {
        var t = arr[i];
        arr[i] = arr[0];
        arr[0] = t;
        maxHeapify(arr, i, 0);
    }
}

function outputHeap(arr) {
    var height = Math.ceil(Math.log(arr.length + 1));

}

function makeRands(n)
{
    var arr = [];
    while(n--){
        arr.push(Math.floor(Math.random() * 100));
    }
    return arr;
}

var arr = makeRands(20);
heapSort(arr);

console.log(arr.join(','));
