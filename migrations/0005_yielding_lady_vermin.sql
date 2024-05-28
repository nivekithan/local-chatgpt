-- Custom SQL migration file, put you code below! --

update messages set last_modified_version = last_modified_version + 1;

update message_list set last_modified_version = last_modified_version + 1;
