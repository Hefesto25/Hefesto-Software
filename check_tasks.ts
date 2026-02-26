import { supabase } from './lib/supabase';

async function checkTasks() {
    const { data, error } = await supabase.from('tarefas_operacionais').select('id, titulo, status');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('--- FORAM ENCONTRADAS ' + data.length + ' TAREFAS NO BANCO ---');
    console.log(data);
}

checkTasks();
