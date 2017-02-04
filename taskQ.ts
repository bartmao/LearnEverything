export default class TaskQ {
    private q: TaskEntry[] = [];
    private started = false;
    private current: number = 0;

    constructor(public max: number, public func: (...p: any[]) => Promise<{}>) {
    }

    async push(...paras: Object[]): Promise<{}> {
        return new Promise((resolve, reject) => {
            var task = new TaskEntry(paras, resolve, reject);
            if (this.current < this.max) {
                this.proccessQ(task);
            }
            else {
                this.q.push(task);
            }
        });
    }

    async proccessQ(e?: TaskEntry) {
        if (this.current >= this.max) return;
        var nextEntry = e ? e : this.q.shift();
        if (nextEntry) {
            this.current++;
            this.func.apply(this.func, nextEntry.paras).then(v => {
                this.current--;
                nextEntry.resolve(v);
                this.proccessQ();
            }).catch(r => {
                this.current--;
                nextEntry.reject(r);
                this.proccessQ();
            });
        }
    }
}

class TaskEntry {
    constructor(public paras: Object[], public resolve?: Function, public reject?: Function) { }
}