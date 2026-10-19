export const INVENTORY_SIZE = 7;

// The bag belongs to the current exploration session, independently of story saves.
export function createInventory(onChange=()=>{}) {
  const slots=Array(INVENTORY_SIZE).fill(null);
  let selected=0;
  function select(index) {
    if(!Number.isInteger(index)||index<0||index>=slots.length) return false;
    selected=index;onChange();return true;
  }
  return {
    slots,
    get selected(){return selected;},
    select,
    cycle(direction){return select((selected+Math.sign(direction)+slots.length)%slots.length);},
    store(item){
      if(!item||item.broken||typeof item.id!=='string'||typeof item.name!=='string') return -1;
      const index=slots.indexOf(null);if(index===-1)return -1;
      slots[index]={...item};onChange();return index;
    },
    remove(index){
      if(!Number.isInteger(index)||index<0||index>=slots.length)return null;
      const item=slots[index];slots[index]=null;onChange();return item;
    },
    update(index,patch){
      if(!slots[index])return false;
      Object.assign(slots[index],patch);onChange();return true;
    },
  };
}
